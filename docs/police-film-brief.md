# Police film production brief

The user will create the realistic motion clips in Google Flow and supply the exports. No photoreal video has been supplied yet. The game does **not** describe its current Three.js fallback as photoreal generated video.

## Continuity

- Vehicle must match the selected user asset. Suburban: black body, white doors, original SHERIFF lettering and gold star. Duster: white body, blue/yellow POLIȚIA livery, original roof light bar. Do not replace, repaint, resize body proportions, or swap cars between shots.
- Fictional Egyptian adult officers in summer white shirts, dark trousers and matching caps; two fictional adult suspects. No identifiable real people or actual news footage.
- Arrest: 8–10 seconds, daytime Assiut street, officers escort the adults to rear passenger doors, doors open, adults sit inside, doors close; no violence. Camera follows the action smoothly; vehicle geometry and markings stay stable.
- Handoff: 8–10 seconds, selected vehicle parked in front of an Egyptian-style station; officers open rear passenger doors, help adults out, escort them through the entrance. Separate variants with legible signs **قسم أول** and **قسم ثاني**. The station never changes mid-shot.
- Landscape 16:9 at 1080p; frame all action inside a portrait-safe central region; no letterboxing, inset frames, montage grids, title cards, watermarks or fabricated documentary claims. Correct walking, door operation and hand anatomy.

## Integration

Place authorized generated MP4 files in `assets/media/`. Populate `police-films.json` entries for `policeSuburban` and `policeDuster`, each with `arrest`, `handoffFirst`, `handoffSecond` objects of the form `{ "src": "assets/media/file.mp4" }`. Runtime selects the actual vehicle and assigned station; missing or failed film uses the clearly labelled game scene. Imported BMW remains a native-model game scene unless a matching verified clip is provided.

## Visual references (research only; images are not redistributed)

- Egyptian Interior Ministry station directory: https://www.moi.gov.eg/publicsecurity/home/branches
- New Asyut station exterior photograph, reference for Egyptian station architecture, not a claim to reproduce first/second station exactly: https://www.youm7.com/story/2016/11/26/بدء-تشغيل-قسم-شرطة-أسيوط-الجديدة/2984501
- Monqabad overpass blue signs and white lettering in Asyut: https://www.agrinewz.com/Section-223/أخبار-مصر/رئيس-الوزراء-يفتتح-مشروع-كوبري-منقباد-العلوي-بالمدخل-الشمالي-لمدينة-أسيوط-1393424
