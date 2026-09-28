// Which of the store's existing categories a Trendyol product belongs in (a store category slug, or
// null to leave it out). The store's tree is fixed; Trendyol's is only read.
//
// First the animal, from Trendyol's category path ("Kedi Ürünleri", "Köpek Ürünleri", ...), falling
// back to the product name for shared categories like "Kedi ve Köpek Mama Su Kabı". Then the first
// rule for that animal whose pattern matches the Trendyol leaf category or the product name.

const ANIMALS = [
  ["kedi", /\bkedi|\bcat\b|kitten/i],
  ["kopek", /köpek|kopek|\bdog\b|puppy/i],
  ["kus", /\bkuş|\bkus\b|muhabbet|kanarya|papağan|bird/i],
  ["akvaryum", /akvaryum|balık|balik|aquarium/i],
  ["kemirgen", /kemirgen|hamster|tavşan|tavsan|guinea|ginepig|kobay|chinchilla/i],
  ["surungen", /sürüngen|surungen|kaplumbağa|reptile|teraryum/i],
];

// [store slug, pattern]. Order matters: the first match wins. Patterns see "<leaf> | <product name>".
const RULES = {
  kedi: [
    ["kedi-odul-mamasi", /ödül|odul|treat|atıştırmalık|stick|krema|sıvı ödül|cream/i],
    ["konserve-kedi-mamasi", /konserve|\bcan\b/i],
    ["yas-kedi-mamasi", /yaş mama|yas mama|pouch|ıslak|jöle|sos içinde|gravy|\bwet\b/i],
    ["kuru-kedi-mamasi", /kedi maması|kedi mamasi|kuru mama|cat food/i],
    ["kedi-vitaminleri", /vitamin|macun|malt|takviye|supplement|probiyotik/i],
    ["med-cats", /sağlık ürünü|ilaç|pire|kene|parazit|damla|antiseptik/i],
    ["kedi-kumu-kuregi", /kürek|kurek/i],
    ["otomatik-kedi-tuvaleti", /otomatik.*tuvalet|akıllı.*tuvalet/i],
    ["kedi-tuvaleti", /tuvalet|kum kabı|litter box/i],
    ["kristal-kedi-kumu", /kristal|silika/i],
    ["bentonit-kedi-kumu", /kedi kumu|kum\b|litter/i],
    ["kedi-su-pinari", /pınar|pinar|çeşme|fountain/i],
    ["otomatik-kedi-kabi", /otomatik|akıllı.*mama|feeder/i],
    ["kedi-biberonu", /biberon/i],
    ["plastik-kedi-kabi", /mama kabı|su kabı|mama su kabı|kap\b|bowl/i],
    ["kedi-gogus-tasmasi", /göğüs|gogus|harness/i],
    ["kedi-boyun-tasmasi", /tasma|collar/i],
    ["kedi-tasima-cantasi", /taşıma|tasima|çanta|carrier/i],
    ["kedi-tirnak-makaslari", /tırnak|tirnak/i],
    ["kedi-firca-ve-taraklari", /fırça|firca|tarak|brush|comb|tüy toplayıcı/i],
    ["kedi-temizlik-ve-banyo-urunleri", /şampuan|sampuan|mendil|temizl|banyo|koku giderici|parfüm|shampoo/i],
    ["kedi-tirmalama-tahtasi", /tırmalama|tirmalama|scratch|kedi ağacı|kedi agaci|oyun evi/i],
    ["kedi-oyuncaklari", /oyuncak|toy|catnip|kedi otu|kedi çimi|olta|lazer|top\b/i],
    ["kedi-aksesuarlari", /./], // anything else for cats
  ],
  kopek: [
    ["kopek-odul-mamasi", /ödül|odul|treat|atıştırmalık|kemik|çiğneme|stick|jerky/i],
    ["konserve-kopek-mamasi", /konserve|\bcan\b/i],
    ["yas-kopek-mamasi", /yaş mama|yas mama|pouch|ıslak|\bwet\b/i],
    ["kuru-kopek-mamasi", /köpek maması|kopek mamasi|kuru mama|dog food/i],
    ["kopek-agiz-ve-dis-bakim", /diş|dis\b|ağız|dental/i],
    ["kopek-goz-ve-kulak-urunleri", /göz|kulak|\bear\b|\beye\b/i],
    ["kopek-tuy-ve-deri-bakim", /deri|tüy bakım|pati|losyon|krem|vitamin|takviye|supplement/i],
    ["med-dogs", /sağlık ürünü|ilaç|pire|kene|parazit|damla|antiseptik/i],
    ["kopek-tirnak-makasi", /tırnak|tirnak/i],
    ["kopek-firca-ve-taraklari", /fırça|firca|tarak|brush|comb|tüy toplayıcı/i],
    ["kopek-temizlik-ve-banyo", /şampuan|sampuan|mendil|temizl|banyo|koku giderici|parfüm|shampoo/i],
    ["tuvalet-egitim-urunleri", /çiş|cis\b|pedi|tuvalet|dışkı|poşet/i],
    ["kopek-egitim-urunleri", /eğitim|egitim|klik|düdük|training/i],
    ["kopek-su-pinari", /pınar|pinar|çeşme|fountain/i],
    ["otomatik-kopek-kabi", /otomatik|akıllı.*mama|feeder/i],
    ["celik-kopek-kabi", /çelik|celik|metal|stainless/i],
    ["seramik-kopek-kabi", /seramik|ceramic/i],
    ["plastik-kopek-kabi", /mama kabı|su kabı|mama su kabı|kap\b|bowl|suluk/i],
    ["kopek-gezdirme-tasmasi", /gezdirme|uzayabilen|flexi|kayış|leash|göğüs|gogus|harness/i],
    ["kopek-boyun-tasmasi", /tasma|collar/i],
    ["kopek-tasima-cantasi", /taşıma çanta|tasima canta|çanta|sırt/i],
    ["kopek-tasima-urunleri", /taşıma|tasima|kafes|araba|oto|emniyet|travel/i],
    ["kopek-oyuncaklari", /oyuncak|toy|top\b|ip\b|frizbi|kong/i],
    ["kopek-aksesuarlari", /./], // anything else for dogs
  ],
  kus: [
    ["muhabbet-kusu-yemi", /muhabbet.*yem|yem.*muhabbet/i],
    ["kanarya-yemi", /kanarya.*yem|yem.*kanarya/i],
    ["papagan-yemi", /papağan.*yem|papagan.*yem|yem.*papağan/i],
    ["kus-yemi", /yem|kraker|food/i],
    ["kus-kumu", /kum\b|sand/i],
    ["kus-saglik-bakim", /vitamin|bakım|bakim|sağlık|saglik|mineral|gaga taşı|kalamar/i],
    ["med-other-pets", /sağlık ürünü|ilaç|parazit/i],
    ["kus-oyuncagi-ve-aksesuari", /oyuncak|tünek|tunek|salıncak|ayna|kafes|yuva|banyo|yemlik|suluk|aksesuar/i],
  ],
  akvaryum: [
    ["discus-yemi", /discus/i],
    ["balik-yemi", /yem|food/i],
    ["balik-vitamin-ve-mineral", /vitamin|mineral|bakteri|su düzenleyici|klor/i],
    ["dalga-motoru", /dalga/i],
    ["kafa-motoru", /kafa motoru|sirkülasyon/i],
    ["hava-motoru", /hava motoru|hava pompası|air pump/i],
    ["dis-filtre", /dış filtre|dis filtre|external/i],
    ["ic-filtre", /filtre|filter/i],
    ["akvaryum-seramik-halka", /seramik halka|filtre malzeme|biyo/i],
    ["akvaryum-cam-yuzeyi-temizleyicileri", /cam.*temiz|mıknatıs|sifon/i],
    ["akvaryum-bakim-ve-temizlik-urunleri", /temizl|bakım|bakim/i],
    ["akvaryum-olcek-ve-regulatorleri", /termometre|ısıtıcı|isitici|test|ölçer|regülatör/i],
    ["akvaryum-kum-ve-taslari", /kum\b|taş|tas\b|çakıl|dekor/i],
    ["diger-akvaryum-urunleri", /akvaryum|aquarium|aydınlatma|led/i],
  ],
  kemirgen: [
    ["hamster-yemi", /hamster.*yem|yem.*hamster/i],
    ["tavsan-yemi", /tavşan.*yem|tavsan.*yem|yem.*tavşan/i],
    ["guinea-pig-yemleri", /guinea|kobay|ginepig/i],
    ["tavsan-kafesi", /tavşan.*kafes|kafes.*tavşan/i],
    ["tavsan-aksesuarlari", /tavşan|tavsan/i],
    ["hamster-aksesuarlari", /hamster|kemirgen|talaş|çark|kafes/i],
  ],
  surungen: [["diger-surungen-aksesuarlari", /./]],
};

/** @param {{name: string, categories: {name: string}[]}} product a cached Trendyol page */
export function storeCategoryFor(product) {
  const path = product.categories.map((c) => c.name).join(" > ");
  if (!/pet shop/i.test(path)) return null;
  // skip Trendyol's generic top levels when looking for the animal
  const specific = product.categories.slice(2).map((c) => c.name).join(" > ");
  const shared = /kedi ve köpek|evcil hayvan/i.test(specific);
  const animal =
    (shared ? null : ANIMALS.find(([, re]) => re.test(specific))?.[0]) ?? ANIMALS.find(([, re]) => re.test(product.name))?.[0] ?? null;
  // shared cat-and-dog categories whose product name names neither animal go under cats
  const leaf = product.categories.at(-1)?.name ?? "";
  const pick = animal ?? (shared ? "kedi" : null);
  if (!pick) return null;
  const text = `${leaf} | ${product.name}`;
  if (shared && !animal && /sağlık/i.test(leaf)) return "med-cats-dogs";
  return RULES[pick].find(([, re]) => re.test(text))?.[0] ?? null;
}
