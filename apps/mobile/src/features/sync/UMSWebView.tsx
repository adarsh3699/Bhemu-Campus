import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { X, RefreshCw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, Radius } from "@/constants/Theme";
import type { UMSSyncResult } from "@bhemu/firebase";
import type { UMSLocalData } from "@bhemu/shared";
import { WEBVIEW_SYNC_SCRIPT } from "./webviewSyncScript";

const DASHBOARD_URL = "https://ums.lpu.in/lpuums/StudentDashboard.aspx";

const FORM_CAPTURE_JS = `(function(){
  function capture(form,submitter){
    try{
      if(window.__umsPostCapture&&typeof window.__umsPostCapture.captureBody==='function'){
        var fd=new FormData(form);
        if(submitter&&submitter.name){fd.append(submitter.name,submitter.value||'');}
        var qs=new URLSearchParams(fd).toString();
        window.__umsPostCapture.captureBody(qs);
      }
    }catch(e){}
  }
  var lastPageState=null;
  var readyCheckTimer=null;
  function publishPageState(state){
    if(state===lastPageState) return;
    var bridge=window.ReactNativeWebView;
    if(!bridge||typeof bridge.postMessage!=='function') return;
    lastPageState=state;
    bridge.postMessage(JSON.stringify({type:state}));
  }
  function isChallengePage(){
    var text=((document.title||'')+' '+(document.body&&document.body.innerText||'')).toLowerCase();
    return text.indexOf('performing security verification')!==-1
      ||text.indexOf('just a moment')!==-1
      ||text.indexOf('checking your browser')!==-1
      ||text.indexOf('verify you are human')!==-1
      ||(text.indexOf('cloudflare')!==-1&&text.indexOf('verifying')!==-1);
  }
  function detectPageState(){
    try{
      var bridge=window.ReactNativeWebView;
      if(!bridge||typeof bridge.postMessage!=='function') return;
      var challenge=isChallengePage();
      if(challenge){
        if(readyCheckTimer){clearTimeout(readyCheckTimer);readyCheckTimer=null;}
        publishPageState('cloudflareChallenge');
        return;
      }
      if(lastPageState==='umsPageReady'||readyCheckTimer) return;
      readyCheckTimer=setTimeout(function(){
        readyCheckTimer=null;
        publishPageState(isChallengePage()?'cloudflareChallenge':'umsPageReady');
      },1000);
    }catch(e){}
  }
  function observePageState(){
    if(!document.documentElement) return;
    var observer=new MutationObserver(detectPageState);
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
    setTimeout(detectPageState,1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',observePageState);
  else observePageState();
  var origSubmit=HTMLFormElement.prototype.submit;
  var bypassing=false;
  HTMLFormElement.prototype.submit=function(){
    if(bypassing){return origSubmit.call(this);}
    capture(this,null);
    var f=this;
    setTimeout(function(){bypassing=true;origSubmit.call(f);bypassing=false;},120);
  };
  var lastClicked=null;
  document.addEventListener('click',function(e){
    var t=e.target;
    while(t&&t!==document){
      if(t.tagName==='INPUT'&&(t.type==='submit'||t.type==='image')){lastClicked=t;return;}
      if(t.tagName==='BUTTON'&&t.type!=='button'){lastClicked=t;return;}
      t=t.parentElement;
    }
  },true);
  document.addEventListener('submit',function(e){
    if(e.target&&e.target.tagName==='FORM'&&!bypassing){
      var btn=e.submitter||lastClicked;
      capture(e.target,btn);
      e.preventDefault();
      var f=e.target;
      setTimeout(function(){bypassing=true;origSubmit.call(f);bypassing=false;},120);
    }
  },true);
})();true;`;

interface Props {
	loginVisible: boolean;
	onSyncData: (data: UMSSyncResult) => void;
	onUmsLocalData: (data: UMSLocalData) => void;
	onNeedsLogin: () => void;
	onChallengeDetected: () => void;
	onLoginDone: () => void;
	onError: (msg: string) => void;
	onClose: () => void;
}

const UMSWebView = ({
	loginVisible,
	onSyncData,
	onUmsLocalData,
	onNeedsLogin,
	onChallengeDetected,
	onLoginDone,
	onError,
	onClose,
}: Props) => {
	const webViewRef = useRef<WebView<object>>(null);
	const syncStartedRef = useRef(false);
	const loginShownRef = useRef(false);
	const currentUrlRef = useRef(DASHBOARD_URL);
	const dashboardReadyRef = useRef(false);
	const pageReadyRef = useRef(false);
	const challengeActiveRef = useRef(false);
	const challengeReloadedRef = useRef(false);
	const [loading, setLoading] = useState(true);
	const [currentUrl, setCurrentUrl] = useState(DASHBOARD_URL);
	const [pageError, setPageError] = useState<string | null>(null);

	const startDashboardSync = () => {
		if (!dashboardReadyRef.current || !pageReadyRef.current || challengeActiveRef.current || syncStartedRef.current) {
			return;
		}
		syncStartedRef.current = true;
		onLoginDone();
		setTimeout(() => {
			webViewRef.current?.injectJavaScript(WEBVIEW_SYNC_SCRIPT);
		}, 800);
	};

	const handleNavigationChange = (nav: WebViewNavigation) => {
		const url = nav.url.toLowerCase();
		currentUrlRef.current = nav.url;
		setCurrentUrl(nav.url);

		if (url.includes("login") && !loginShownRef.current) {
			dashboardReadyRef.current = false;
			loginShownRef.current = true;
			onNeedsLogin();
		} else if (url.includes("studentdashboard") && !nav.loading && !syncStartedRef.current) {
			dashboardReadyRef.current = true;
			startDashboardSync();
		}
	};

	const handleMessage = (event: { nativeEvent: { data: string } }) => {
		try {
			const msg = JSON.parse(event.nativeEvent.data) as { type: string; payload: unknown };
			if (msg.type === "cloudflareChallenge") {
				// A challenge can be discovered by a background fetch even when the
				// visible document is still the dashboard. Allow a fresh sync attempt
				// after the user completes verification in the WebView.
				syncStartedRef.current = false;
				challengeActiveRef.current = true;
				pageReadyRef.current = false;
				onChallengeDetected();
				if (
					msg.payload &&
					typeof msg.payload === "object" &&
					(msg.payload as { source?: string }).source === "fetch" &&
					!challengeReloadedRef.current
				) {
					challengeReloadedRef.current = true;
					webViewRef.current?.reload();
				}
			} else if (msg.type === "umsPageReady") {
				challengeActiveRef.current = false;
				pageReadyRef.current = true;
				startDashboardSync();
			} else if (msg.type === "syncData") {
				onSyncData(msg.payload as UMSSyncResult);
			} else if (msg.type === "umsLocalData") {
				onUmsLocalData(msg.payload as UMSLocalData);
			} else if (msg.type === "error") {
				if (msg.payload === "SESSION_EXPIRED") {
					syncStartedRef.current = false;
					loginShownRef.current = false;
					dashboardReadyRef.current = false;
					pageReadyRef.current = false;
					challengeActiveRef.current = false;
					onNeedsLogin();
				} else {
					const message = typeof msg.payload === "string" ? msg.payload : "UMS sync failed.";
					setPageError(message);
					onError(message);
				}
			}
		} catch {
			// malformed WebView messages are silently ignored
		}
	};

	const displayUrl = currentUrl.replace(/^https?:\/\//, "").slice(0, 42);
	const reportPageError = (message: string) => {
		setPageError(message);
		onError(message);
	};
	const retry = () => {
		setPageError(null);
		syncStartedRef.current = false;
		loginShownRef.current = false;
		dashboardReadyRef.current = false;
		pageReadyRef.current = false;
		challengeActiveRef.current = false;
		challengeReloadedRef.current = false;
		webViewRef.current?.reload();
	};

	return (
		<>
			{loginVisible && (
				<SafeAreaView style={local.header} edges={["top"]}>
					<View style={local.headerRow}>
						<TouchableOpacity onPress={onClose} hitSlop={10} style={local.navBtn}>
							<X size={20} color={Colors.textMuted} />
						</TouchableOpacity>
						<View style={local.urlBar}>
							<Text style={local.urlText} numberOfLines={1}>
								{displayUrl}
							</Text>
						</View>
						<TouchableOpacity onPress={retry} hitSlop={10} style={local.navBtn}>
							{loading ? (
								<ActivityIndicator size="small" color={Colors.primary} />
							) : (
								<RefreshCw size={18} color={Colors.textMuted} />
							)}
						</TouchableOpacity>
					</View>
					{loading && <View style={local.progressBar} />}
				</SafeAreaView>
			)}
			<WebView<object>
				ref={webViewRef}
				source={{ uri: DASHBOARD_URL }}
				onNavigationStateChange={handleNavigationChange}
				onMessage={handleMessage}
				onLoadStart={() => {
					setLoading(true);
					setPageError(null);
					syncStartedRef.current = false;
					loginShownRef.current = false;
					dashboardReadyRef.current = false;
					pageReadyRef.current = false;
					challengeActiveRef.current = false;
				}}
				onLoadEnd={() => setLoading(false)}
				onError={(event) => reportPageError(`UMS page could not load: ${event.nativeEvent.description}`)}
				onHttpError={(event) => {
					if (event.nativeEvent.url === currentUrlRef.current && event.nativeEvent.statusCode >= 400) {
						reportPageError(
							`UMS page returned HTTP ${event.nativeEvent.statusCode}: ${event.nativeEvent.description}`
						);
					}
				}}
				style={local.webview}
				javaScriptEnabled
				domStorageEnabled
				sharedCookiesEnabled
				thirdPartyCookiesEnabled
				mixedContentMode="always"
				injectedJavaScriptBeforeContentLoaded={FORM_CAPTURE_JS}
				pullToRefreshEnabled={true}
			/>
			{pageError && (
				<View style={local.errorBanner}>
					<Text style={local.errorText}>{pageError}</Text>
					<TouchableOpacity onPress={retry} style={local.retryButton}>
						<Text style={local.retryText}>Retry</Text>
					</TouchableOpacity>
				</View>
			)}
			</>
		);
};

export default UMSWebView;

const local = StyleSheet.create({
	header: {
		backgroundColor: Colors.surface,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
	},
	navBtn: {
		width: 36,
		height: 36,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
	},
	urlBar: {
		flex: 1,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.lg,
		borderWidth: 1,
		borderColor: Colors.border,
		paddingHorizontal: Spacing.md,
		paddingVertical: 7,
	},
	urlText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: "center" },
	progressBar: { height: 2, backgroundColor: Colors.primary, opacity: 0.7 },
	webview: { flex: 1 },
	errorBanner: {
		position: "absolute",
		left: Spacing.md,
		right: Spacing.md,
		bottom: Spacing.md,
		backgroundColor: Colors.destructive,
		borderRadius: Radius.md,
		padding: Spacing.md,
		gap: Spacing.sm,
	},
	errorText: { color: Colors.textPrimary, fontSize: FontSize.sm },
	retryButton: { alignSelf: "flex-end", paddingHorizontal: Spacing.sm, paddingVertical: 4 },
	retryText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: "700" },
});
