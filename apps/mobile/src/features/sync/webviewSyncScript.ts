// Injected into the UMS WebView after login reaches the dashboard.
// Session cookies are present — fetch() sends them automatically.
// Results sent back to RN via the bridge saved in window.__rnb.

export const WEBVIEW_SYNC_SCRIPT = `
(function() {
  var bridge = window.__rnb || window.ReactNativeWebView;

  function post(type, payload) {
    if (bridge) bridge.postMessage(JSON.stringify({ type: type, payload: payload }));
  }

  function htmlDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html');
  }

  // ── Parsing helpers ───────────────────────────────────────────────────────

  function mapExamType(t) {
    t = t.toLowerCase();
    if (t.includes('attendance')) return 'attendanceMarks';
    if (t.includes('continuous')) return 'ca';
    if (t.includes('mid term')) return 'midTerm';
    if (t.includes('end term')) return 'endTerm';
    return null;
  }

  function extractCourseCode(text) {
    var m = text.match(/^([A-Z]{2,4}\\d{3})/);
    return m ? m[1] : '';
  }

  function isSessionExpired(text) {
    var t = text.toLowerCase();
    return t.includes('session expired') || t.includes('please login') ||
           t.includes('login required') || t.includes('login.aspx');
  }

  function parseCourseGrades(doc) {
    var courses = [];
    var seen = {};
    doc.querySelectorAll('table').forEach(function(table) {
      var currentTermId = '';
      table.querySelectorAll('tr').forEach(function(row) {
        var rowText = row.textContent || '';
        var tm = rowText.match(/TermId[\\s:]*([A-Z0-9]+)/i);
        if (tm && /^[\\dA-Z]{5,7}$/i.test(tm[1])) { currentTermId = tm[1]; return; }
        var cells = Array.from(row.querySelectorAll('td')).map(function(td){ return (td.textContent||'').trim(); });
        var links = Array.from(row.querySelectorAll('a')).map(function(a){ return (a.textContent||'').trim(); });
        var all = cells.concat(links);
        var courseCode='', courseName='', grade='', credits;
        all.forEach(function(text) {
          if (text.includes('::') && /[A-Z]{2,4}\\d{3}/.test(text)) {
            courseCode = extractCourseCode(text);
            courseName = (text.split('::')[1]||'').trim();
          } else if (/^[A-Z]{2,4}\\d{3,4}[A-Z]?$/.test(text)) {
            courseCode = text; courseName = '';
          } else if (/^[A-FO][+-]?$/.test(text) || text === 'O') {
            grade = text;
          } else if (/^\\d+\\.\\d+$/.test(text)) {
            var v = parseFloat(text); if (v > 0 && v <= 6) credits = v;
          }
        });
        if (courseCode && grade) {
          var key = courseCode+'-'+grade+'-'+currentTermId;
          if (!seen[key]) { seen[key]=1; courses.push({ courseCode:courseCode, courseName:courseName, grade:grade, credits:credits, termId:currentTermId||undefined }); }
        }
      });
    });
    return courses;
  }

  function parseCourseWiseMarks(doc, termId) {
    var assessments = [];
    var currentCourse = '';
    doc.querySelectorAll('tr').forEach(function(row) {
      var rowText = row.textContent || '';
      var cm = rowText.match(/Course:\\s*([A-Z]{2,4}\\d{3,4}[A-Z]?::[^,\\n]+)/);
      if (cm) { currentCourse = cm[1].trim(); return; }
      if (!currentCourse) return;
      var cells = Array.from(row.querySelectorAll('td')).map(function(td){ return (td.textContent||'').trim(); });
      if (cells.length < 6) return;
      var assessmentType = cells[1]||'';
      if (!mapExamType(assessmentType)) return;
      function pm(v) { return v.toLowerCase()==='awaited' ? 'Awaited' : (parseInt(v)||v); }
      var parts = currentCourse.split('::');
      var entry = {
        courseCode: extractCourseCode(currentCourse),
        courseName: (parts[1]||'').trim(),
        assessmentType: assessmentType,
        maximumMarks: pm(cells[2]||'0'),
        marksObtained: pm(cells[3]||'0'),
        weightedMaximumMarks: pm(cells[4]||'0'),
        weightedMarksObtained: pm(cells[5]||'0'),
        isAwaited: (cells[3]||'').toLowerCase()==='awaited'||(cells[5]||'').toLowerCase()==='awaited'
      };
      if (termId) entry.termId = termId;
      assessments.push(entry);
    });
    return assessments;
  }

  function parseTerms(doc) {
    var terms = []; var seen = {};
    var tgpaMap = {};
    doc.querySelectorAll('p').forEach(function(p) {
      var m = (p.textContent||'').match(/TermId:\\s*([A-Z0-9]+).*?TGPA:\\s*([\\d.]+)/i);
      if (m) tgpaMap[m[1]] = parseFloat(m[2]);
    });
    doc.querySelectorAll('ul.rcbList li.rcbItem').forEach(function(li) {
      var id = (li.textContent||'').trim();
      if (!id || seen[id]) return; seen[id]=1;
      var cat='Unknown', dn=id;
      if (/^\\d+$/.test(id)) cat='Regular';
      else if (/^\\d+[AB]$/i.test(id)) { cat='Reappear'; dn=id+' (Reappear)'; }
      else if (/^\\d+R$/i.test(id)) { cat='RPL'; dn=id+' (RPL)'; }
      terms.push({ id:id, displayName:dn, category:cat, isActive:false, courses:[], tgpa:tgpaMap[id]||null });
    });
    var order={Regular:0,Reappear:1,RPL:2,Unknown:3};
    terms.sort(function(a,b){
      if(a.category!==b.category) return (order[a.category]||3)-(order[b.category]||3);
      return a.category==='Regular'?a.id.localeCompare(b.id):b.id.localeCompare(a.id);
    });
    var regIds=terms.filter(function(t){return t.category==='Regular';}).map(function(t){return t.id;}).sort().reverse();
    var active={}; regIds.slice(0,2).forEach(function(id){active[id]=1;});
    var c=1; terms.forEach(function(t){ if(t.category==='Regular'){t.displayName='Semester '+(c++);t.isActive=!!active[t.id];}});
    return terms;
  }

  function parseAllTermIds(doc) {
    var ids=[];
    doc.querySelectorAll('ul.rcbList li.rcbItem').forEach(function(li){
      var t=(li.textContent||'').trim();
      if(/^\\d+$/.test(t)||/^\\d+[AB]$/i.test(t)) ids.push(t);
    });
    return ids;
  }

  function parseAttendance(html) {
    var doc = htmlDoc('<html><body>'+html+'</body></html>');
    var results=[];
    doc.querySelectorAll('tr').forEach(function(tr){
      var tds=tr.querySelectorAll('td');
      if(tds.length<6) return;
      var first=(tds[0].textContent||'').trim();
      if(first.includes('Aggregate')) return;
      var ci=first.indexOf(':'); if(ci===-1) return;
      results.push({
        courseCode:first.slice(0,ci).trim(),
        courseName:first.slice(ci+1).trim(),
        totalLectures:parseInt((tds[3].textContent||'0'))||0,
        attendedLectures:parseInt((tds[4].textContent||'0'))||0,
        percentage:parseFloat((tds[5].textContent||'0'))||0
      });
    });
    return results;
  }

  // ── Fetch helpers (cookies sent automatically by browser) ─────────────────

  function buildMultipart(termId, viewState, eventValidation, vstate) {
    var boundary='----WebKitFormBoundary'+Math.random().toString(36).slice(2,18).padEnd(16,'0');
    var body='';
    function add(name, val){ body+='--'+boundary+'\\r\\nContent-Disposition: form-data; name="'+name+'"\\r\\n\\r\\n'+val+'\\r\\n'; }
    add('ctl00_RadScriptManager1_TSM','');
    add('__EVENTTARGET','ctl00$cphHeading$rdTerm');
    add('__EVENTARGUMENT','{"Command":"Select","Index":0}');
    add('__LASTFOCUS','');
    add('__VSTATE',vstate);
    add('__VIEWSTATE',viewState);
    add('__EVENTVALIDATION',eventValidation);
    add('ctl00$cphHeading$rdTerm',termId);
    add('ctl00_cphHeading_rdTerm_ClientState','{"logEntries":[],"value":"'+termId+'","text":"'+termId+'","enabled":true,"checkedIndices":[],"checkedItemsTextOverflows":false}');
    body+='--'+boundary+'--\\r\\n';
    return { body:body, boundary:boundary };
  }

  async function doSync() {
    try {
      post('progress', 'Fetching grades from UMS...');

      var RESULTS_URL = 'https://ums.lpu.in/lpuums/frmStudentResult.aspx';
      var DASH = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx';

      // Parallel: results page + student info + attendance
      var [resHtml, siRaw, attRaw] = await Promise.all([
        fetch(RESULTS_URL, {credentials:'include'}).then(function(r){return r.text();}),
        fetch(DASH+'/GetStudentBasicInformation',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json;charset=UTF-8','X-Requested-With':'XMLHttpRequest'},body:'{}'}).then(function(r){return r.json();}).catch(function(){return null;}),
        fetch(DASH+'/StudentAttendanceSummary',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json;charset=UTF-8','X-Requested-With':'XMLHttpRequest'},body:'{}'}).then(function(r){return r.json();}).catch(function(){return null;})
      ]);

      var resDoc = htmlDoc(resHtml);
      if (isSessionExpired(resDoc.body ? resDoc.body.textContent : resHtml)) {
        post('error', 'SESSION_EXPIRED'); return;
      }

      var viewState = (resDoc.querySelector('input[name="__VIEWSTATE"]')||{}).value||'';
      var eventValidation = (resDoc.querySelector('input[name="__EVENTVALIDATION"]')||{}).value||'';
      var vstate = (resDoc.querySelector('input[name="__VSTATE"]')||{}).value||'';

      var allTermIds = parseAllTermIds(resDoc);
      var terms = parseTerms(resDoc);

      post('progress', 'Fetching '+allTermIds.length+' semester(s)...');

      var allCourses = parseCourseGrades(resDoc);
      var allAssessments = parseCourseWiseMarks(resDoc, undefined);

      var termResults = await Promise.allSettled(allTermIds.map(function(tid){
        var mp = buildMultipart(tid, viewState, eventValidation, vstate);
        return fetch(RESULTS_URL, {
          method:'POST', credentials:'include',
          headers:{'Content-Type':'multipart/form-data; boundary='+mp.boundary},
          body:mp.body
        }).then(function(r){return r.text();})
          .then(function(html){
            var d=htmlDoc(html);
            return { courses:parseCourseGrades(d), assessments:parseCourseWiseMarks(d,tid) };
          });
      }));

      termResults.forEach(function(r){
        if(r.status==='fulfilled'){ allCourses=allCourses.concat(r.value.courses); allAssessments=allAssessments.concat(r.value.assessments); }
      });

      // Dedupe courses
      var cm={}; var dedupedCourses=[];
      allCourses.forEach(function(c){ var k=c.courseCode+'-'+c.grade+'-'+(c.termId||''); if(!cm[k]){cm[k]=1;dedupedCourses.push(c);} });

      // Parse student info
      var si=null;
      if(siRaw&&siRaw.d){ var arr=Array.isArray(siRaw.d)?siRaw.d:null; var info=arr?arr[0]:null;
        if(info) si={vid:info.Registrationnumber||info.StudentUid||null,name:info.StudentName||null,program:info.Program||null,batchYear:info.BatchYear||null,cgpa:info.CGPA||null};
      }

      // Parse attendance
      var attendance=[];
      if(attRaw&&typeof attRaw.d==='string'&&attRaw.d.trim()) attendance=parseAttendance(attRaw.d);

      post('syncData', {
        studentInfo: si,
        courses: dedupedCourses,
        courseAssessments: allAssessments,
        attendance: attendance,
        terms: terms
      });
    } catch(e) {
      post('error', e&&e.message ? e.message : String(e));
    }
  }

  doSync();
  true;
})();
`;
