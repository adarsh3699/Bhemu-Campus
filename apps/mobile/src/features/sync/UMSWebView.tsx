import { useRef, useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { X, RefreshCw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, Radius } from "@/constants/Theme";
import type { UMSSyncResult } from "@bhemu/firebase";
import { WEBVIEW_SYNC_SCRIPT } from "./webviewSyncScript";

const DASHBOARD_URL = "https://ums.lpu.in/lpuums/StudentDashboard.aspx";

const CHROME_ANDROID_UA =
	"Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const STEALTH_JS = `(function(){
  try{var b=window.ReactNativeWebView;if(b){window.__rnb=b;}Object.defineProperty(window,'ReactNativeWebView',{get:function(){return undefined;},configurable:true});}catch(e){}
  try{delete window.Android;}catch(e){}
  try{Object.defineProperty(Navigator.prototype,'webdriver',{get:function(){return undefined;},configurable:true});}catch(e){}
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

export interface UMSWebViewHandle {
	reload: () => void;
}

interface Props {
	loginVisible: boolean;
	onSyncData: (data: UMSSyncResult) => void;
	onProgress: (msg: string) => void;
	onNeedsLogin: () => void;
	onLoginDone: () => void;
	onError: (msg: string) => void;
	onClose: () => void;
}

const UMSWebView = forwardRef<UMSWebViewHandle, Props>(function UMSWebView(
	{ loginVisible, onSyncData, onProgress, onNeedsLogin, onLoginDone, onError, onClose },
	ref
) {
	const webViewRef = useRef<WebView>(null);
	const syncStartedRef = useRef(false);
	const loginShownRef = useRef(false);
	const [loading, setLoading] = useState(true);
	const [currentUrl, setCurrentUrl] = useState(DASHBOARD_URL);

	useImperativeHandle(ref, () => ({
		reload: () => {
			syncStartedRef.current = false;
			loginShownRef.current = false;
			webViewRef.current?.reload();
		},
	}));

	const handleNavigationChange = (nav: WebViewNavigation) => {
		const url = nav.url.toLowerCase();
		setCurrentUrl(nav.url);

		if (url.includes("login") && !loginShownRef.current) {
			loginShownRef.current = true;
			onNeedsLogin();
		} else if (url.includes("studentdashboard") && !nav.loading && !syncStartedRef.current) {
			syncStartedRef.current = true;
			if (loginShownRef.current) {
				// User just logged in — hide browser, sync silently
				onLoginDone();
			}
			setTimeout(() => {
				webViewRef.current?.injectJavaScript(WEBVIEW_SYNC_SCRIPT);
			}, 800);
		}
	};

	const handleMessage = (event: { nativeEvent: { data: string } }) => {
		try {
			const msg = JSON.parse(event.nativeEvent.data) as { type: string; payload: unknown };
			if (msg.type === "progress") {
				onProgress(msg.payload as string);
			} else if (msg.type === "syncData") {
				onSyncData(msg.payload as UMSSyncResult);
			} else if (msg.type === "error") {
				if (msg.payload === "SESSION_EXPIRED") {
					onNeedsLogin();
				} else {
					onError(msg.payload as string);
				}
			}
		} catch {}
	};

	const displayUrl = currentUrl.replace(/^https?:\/\//, "").slice(0, 42);

	return (
		<>
			{loginVisible && (
				<SafeAreaView style={local.header} edges={["top"]}>
					<View style={local.headerRow}>
						<TouchableOpacity onPress={onClose} hitSlop={10} style={local.navBtn}>
							<X size={20} color={Colors.textMuted} />
						</TouchableOpacity>
						<View style={local.urlBar}>
							<Text style={local.urlText} numberOfLines={1}>{displayUrl}</Text>
						</View>
						<TouchableOpacity
							onPress={() => webViewRef.current?.reload()}
							hitSlop={10}
							style={local.navBtn}
						>
							{loading
								? <ActivityIndicator size="small" color={Colors.primary} />
								: <RefreshCw size={18} color={Colors.textMuted} />
							}
						</TouchableOpacity>
					</View>
					{loading && <View style={local.progressBar} />}
				</SafeAreaView>
			)}
			<WebView
				ref={webViewRef}
				source={{ uri: DASHBOARD_URL }}
				onNavigationStateChange={handleNavigationChange}
				onMessage={handleMessage}
				onLoadStart={() => setLoading(true)}
				onLoadEnd={() => setLoading(false)}
				style={local.webview}
				javaScriptEnabled
				domStorageEnabled
				sharedCookiesEnabled
				thirdPartyCookiesEnabled
				userAgent={CHROME_ANDROID_UA}
				mixedContentMode="always"
				injectedJavaScriptBeforeContentLoaded={STEALTH_JS}
			/>
		</>
	);
});

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
});
