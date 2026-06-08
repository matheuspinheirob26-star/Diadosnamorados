import React, { useEffect } from 'react';
import { useStorefront } from '../context/StorefrontContext';

export const TrackingScripts: React.FC = () => {
  const { config } = useStorefront();

  useEffect(() => {
    // Função utilitária para injetar scripts no <head>
    const injectScript = (id: string, src: string | null, content: string | null) => {
      if (document.getElementById(id)) {
        document.getElementById(id)?.remove(); // Remove script antigo se existir
      }

      if (!src && !content) return;

      const script = document.createElement('script');
      script.id = id;
      
      if (src) {
        script.src = src;
        script.async = true;
      }
      
      if (content) {
        script.innerHTML = content;
      }

      document.head.appendChild(script);
    };

    // Google Tag Manager
    if (config.googleTagManager) {
      injectScript('gtm-script', null, `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${config.googleTagManager}');
      `);
    }

    // Google Analytics (G-TAG)
    if (config.googleAnalytics) {
      injectScript('ga-script-src', `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalytics}`, null);
      injectScript('ga-script-init', null, `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${config.googleAnalytics}');
      `);
    }

    // Meta Pixel
    if (config.metaPixel) {
      injectScript('meta-pixel', null, `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${config.metaPixel}');
        fbq('track', 'PageView');
      `);
    }

    // TikTok Pixel
    if (config.tiktokPixel) {
      injectScript('tiktok-pixel', null, `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
          ttq.load('${config.tiktokPixel}');
          ttq.page();
        }(window, document, 'ttq');
      `);
    }

  }, [config.metaPixel, config.googleAnalytics, config.googleTagManager, config.tiktokPixel]);

  return null; // Componente invisível
};
