(()=>{
  'use strict';

  const frames=[...document.querySelectorAll('iframe[data-cerberus-embed]')];
  const mobile=window.matchMedia('(max-width: 820px)');
  const resizeObservers=new WeakMap();

  const embeddedCss=`
    html,body{max-width:100%!important;overflow-x:hidden!important}
    body{margin:0!important}
    .cerberus-launcher{display:none!important}
    .topbar{display:none!important}
    .rail{display:none!important}
    .shell{display:block!important;grid-template-columns:1fr!important}
    .main{display:block!important;grid-column:auto!important;min-width:0!important}
    .hero,.intro{min-height:auto!important}
    @media(max-width:820px){
      .hero,.intro,.lab,.section,.boundary,.evidenceBoundary,.finalBoundary,.pad{padding-left:16px!important;padding-right:16px!important}
      .hero h1,.intro h1{font-size:clamp(3rem,15vw,4.4rem)!important;overflow-wrap:anywhere}
      .section h2,.lab h2,.boundary h2,.evidenceBoundary h2,.finalBoundary h2{font-size:clamp(2.5rem,11vw,3.6rem)!important;overflow-wrap:anywhere}
      .orbit{margin-left:-24px!important;margin-right:-24px!important}
      footer{padding-left:16px!important;padding-right:16px!important}
    }
  `;

  function installEmbedMode(frame){
    const doc=frame.contentDocument;
    if(!doc||!doc.documentElement)return;

    doc.documentElement.dataset.cerberusEmbedded='true';
    if(doc.body)doc.body.dataset.cerberusEmbedded='true';

    doc.querySelectorAll('.cerberus-launcher').forEach(node=>node.remove());

    if(!doc.getElementById('cerberus-embed-style')){
      const style=doc.createElement('style');
      style.id='cerberus-embed-style';
      style.textContent=embeddedCss;
      doc.head.appendChild(style);
    }

    frame.setAttribute('scrolling','yes');
    try{frame.contentWindow.scrollTo(0,0)}catch(_){/* same-origin guard */}
  }

  function measuredHeight(frame){
    const doc=frame.contentDocument;
    if(!doc)return 760;
    const body=doc.body;
    const root=doc.documentElement;
    return Math.max(
      body?.scrollHeight||0,
      body?.offsetHeight||0,
      root?.scrollHeight||0,
      root?.offsetHeight||0,
      760
    );
  }

  function resize(frame){
    if(mobile.matches){
      frame.style.removeProperty('height');
      return;
    }
    try{
      const height=Math.min(measuredHeight(frame)+8,14000);
      frame.style.height=`${height}px`;
    }catch(_){
      frame.style.height='980px';
    }
  }

  function watch(frame){
    const doc=frame.contentDocument;
    if(!doc||typeof ResizeObserver==='undefined'||mobile.matches)return;
    resizeObservers.get(frame)?.disconnect();
    const observer=new ResizeObserver(()=>resize(frame));
    if(doc.body)observer.observe(doc.body);
    observer.observe(doc.documentElement);
    resizeObservers.set(frame,observer);
  }

  function ready(frame){
    try{
      installEmbedMode(frame);
      resize(frame);
      watch(frame);
      setTimeout(()=>resize(frame),250);
      setTimeout(()=>resize(frame),900);
      setTimeout(()=>resize(frame),1800);
      frame.dataset.embedState='ready';
    }catch(_){
      frame.dataset.embedState='ready';
      frame.style.height=mobile.matches?'100%':'980px';
    }
  }

  frames.forEach(frame=>{
    frame.dataset.embedState='loading';
    frame.addEventListener('load',()=>ready(frame));
    if(frame.contentDocument?.readyState==='complete')ready(frame);
  });

  const refresh=()=>frames.forEach(frame=>{
    resizeObservers.get(frame)?.disconnect();
    resize(frame);
    watch(frame);
  });

  if(typeof mobile.addEventListener==='function')mobile.addEventListener('change',refresh);
  else if(typeof mobile.addListener==='function')mobile.addListener(refresh);
  addEventListener('resize',refresh,{passive:true});
})();
