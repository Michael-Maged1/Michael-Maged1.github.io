/* =====================================================================
   إعدادات إعلانات جوجل أدسنس (Google AdSense) — متوافقة مع سياسات جوجل
   ===================================================================== */
const ADS_CONFIG = {
  enabled: true,
  client: 'ca-pub-1820524955775833',
  slots: {
    menu: '0000000000',  // اختياري: ضع رقم الوحدة الإعلانية للقائمة الرئيسية عند إنشائها
    pause: '0000000000', // اختياري: ضع رقم الوحدة الإعلانية لقائمة التوقف المؤقت عند إنشائها
  },
};

function isAdSenseConfigured() {
  return !!(
    ADS_CONFIG.enabled &&
    typeof ADS_CONFIG.client === 'string' &&
    /^ca-pub-\d{10,}$/.test(ADS_CONFIG.client)
  );
}

function mountAdSlot(containerId, slotId) {
  const wrap = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
  if (!wrap) return;
  if (!isAdSenseConfigured() || !/^\d{6,}$/.test(String(slotId || ''))) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  if (wrap.dataset.adMounted) return;
  wrap.dataset.adMounted = '1';
  wrap.innerHTML = `<span class="adLabel">إعلان</span><ins class="adsbygoogle" style="display:block" data-ad-client="${ADS_CONFIG.client}" data-ad-slot="${slotId}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (_) {}
}

function initGoogleAds() {
  if (typeof document === 'undefined' || !isAdSenseConfigured()) return;
  const hasScript = typeof document.querySelector === 'function' && document.querySelector('script[data-adsense-client]');
  if (!hasScript && document.head && typeof document.createElement === 'function') {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    if (s.dataset) s.dataset.adsenseClient = ADS_CONFIG.client;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADS_CONFIG.client)}`;
    document.head.appendChild?.(s);
  }
  mountAdSlot('adMenuBanner', ADS_CONFIG.slots.menu);
  mountAdSlot('adPauseBanner', ADS_CONFIG.slots.pause);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGoogleAds);
  else initGoogleAds();
}
