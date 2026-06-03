const MUTE_SCRIPT = `<script>(function(){
  var O=window.AudioContext||window.webkitAudioContext;
  if(O){
    var F=function(o){var c=new O(o);c.resume=function(){return Promise.resolve();};c.suspend();return c;};
    F.prototype=O.prototype;
    window.AudioContext=window.webkitAudioContext=F;
  }
  var mo=new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes.forEach(function(n){
    if(n.nodeType===1){if(n.matches&&n.matches("audio,video"))n.muted=true;if(n.querySelectorAll)n.querySelectorAll("audio,video").forEach(function(e){e.muted=true;});}
  });});});
  document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll("audio,video").forEach(function(e){e.muted=true;});
    mo.observe(document.documentElement,{childList:true,subtree:true});
  });
})()</script>`;

export function buildMutedHtml(html) {
  return /<head(\s[^>]*)?>/i.test(html)
    ? html.replace(/<head(\s[^>]*)?>/i, m => m + MUTE_SCRIPT)
    : MUTE_SCRIPT + html;
}
