// Daftar bank di Indonesia untuk isian "Bank Tujuan Transfer". Nama yang
// disimpan adalah `name`; `aliases` dipakai untuk menormalkan ketikan bebas
// (mis. "bca" -> "BCA", "bank mandiri" -> "Mandiri"). Bank yang tidak ada di
// daftar tetap bisa diketik manual.
export const BANKS = [
  // Bank BUMN & swasta besar
  { name: "BCA", aliases: ["bank central asia", "bank bca"] },
  { name: "Mandiri", aliases: ["bank mandiri"] },
  { name: "BRI", aliases: ["bank rakyat indonesia", "bank bri"] },
  { name: "BNI", aliases: ["bank negara indonesia", "bank bni"] },
  { name: "BSI (Bank Syariah Indonesia)", aliases: ["bsi", "bank syariah indonesia", "bank bsi"] },
  { name: "BTN", aliases: ["bank tabungan negara", "bank btn"] },
  { name: "CIMB Niaga", aliases: ["cimb", "bank cimb niaga", "octo"] },
  { name: "Danamon", aliases: ["bank danamon"] },
  { name: "Permata", aliases: ["bank permata", "permatabank"] },
  { name: "Maybank Indonesia", aliases: ["maybank", "bank maybank"] },
  { name: "OCBC Indonesia", aliases: ["ocbc", "ocbc nisp", "bank ocbc"] },
  { name: "Panin", aliases: ["bank panin", "panin bank"] },
  { name: "SMBC Indonesia (Jenius / BTPN)", aliases: ["btpn", "jenius", "smbc", "bank btpn"] },
  { name: "Bank Mega", aliases: ["mega"] },
  { name: "KB Bank (Bukopin)", aliases: ["bukopin", "kb bukopin", "kb bank"] },
  { name: "Bank Sinarmas", aliases: ["sinarmas"] },
  { name: "UOB Indonesia", aliases: ["uob"] },
  { name: "HSBC Indonesia", aliases: ["hsbc"] },
  { name: "Standard Chartered", aliases: ["stanchart"] },
  { name: "Citibank", aliases: ["citi"] },
  { name: "DBS Indonesia", aliases: ["dbs", "digibank"] },
  { name: "MNC Bank", aliases: ["mnc"] },
  { name: "J Trust Bank", aliases: ["jtrust", "j trust"] },
  { name: "Bank Mayapada", aliases: ["mayapada"] },
  { name: "Bank Artha Graha", aliases: ["artha graha"] },
  { name: "Bank Woori Saudara", aliases: ["woori", "woori saudara"] },
  { name: "QNB Indonesia", aliases: ["qnb"] },
  { name: "Bank Victoria", aliases: ["victoria"] },
  { name: "Bank Capital", aliases: ["capital"] },
  { name: "Bank Mestika", aliases: ["mestika"] },
  { name: "Bank Index Selindo", aliases: ["bank index"] },
  { name: "Bank Ganesha", aliases: ["ganesha"] },
  { name: "Bank Maspion", aliases: ["maspion"] },
  { name: "Bank Shinhan Indonesia", aliases: ["shinhan"] },
  { name: "Bank IBK Indonesia", aliases: ["ibk"] },
  { name: "KEB Hana Bank", aliases: ["hana", "hana bank"] },
  { name: "Bank China Construction (CCB Indonesia)", aliases: ["ccb"] },
  { name: "Bank of China", aliases: ["boc"] },
  { name: "ICBC Indonesia", aliases: ["icbc"] },

  // Bank digital
  { name: "Bank Jago", aliases: ["jago"] },
  { name: "SeaBank", aliases: ["sea bank"] },
  { name: "blu (BCA Digital)", aliases: ["blu", "bca digital", "blu by bca"] },
  { name: "Bank Neo Commerce", aliases: ["neo", "neobank", "bnc"] },
  { name: "Allo Bank", aliases: ["allo"] },
  { name: "Bank Raya", aliases: ["raya"] },
  { name: "LINE Bank (KEB Hana)", aliases: ["line bank", "linebank"] },
  { name: "Krom Bank", aliases: ["krom"] },
  { name: "Superbank", aliases: ["super bank"] },
  { name: "Hibank", aliases: ["hi bank"] },
  { name: "Bank Saqu (Bank Jasa Jakarta)", aliases: ["saqu", "bank jasa jakarta"] },
  { name: "TMRW (UOB)", aliases: ["tmrw"] },

  // Bank syariah
  { name: "Bank Muamalat", aliases: ["muamalat", "bank muamalat indonesia"] },
  { name: "BCA Syariah", aliases: ["bcas"] },
  { name: "Bank Mega Syariah", aliases: ["mega syariah"] },
  { name: "BTPN Syariah", aliases: [] },
  { name: "Bank Panin Dubai Syariah", aliases: ["panin syariah"] },
  { name: "Bank Victoria Syariah", aliases: [] },
  { name: "KB Bukopin Syariah", aliases: ["bukopin syariah"] },
  { name: "Bank Aladin Syariah", aliases: ["aladin"] },
  { name: "BJB Syariah", aliases: [] },

  // Bank Pembangunan Daerah (BPD)
  { name: "Bank DKI", aliases: ["dki", "jakone"] },
  { name: "Bank BJB", aliases: ["bjb", "bank jabar banten"] },
  { name: "Bank Jateng", aliases: ["jateng", "bank jawa tengah"] },
  { name: "Bank Jatim", aliases: ["jatim", "bank jawa timur"] },
  { name: "Bank BPD DIY", aliases: ["bpd diy", "bank jogja", "bank yogyakarta"] },
  { name: "Bank Banten", aliases: ["banten"] },
  { name: "Bank Aceh Syariah", aliases: ["bank aceh"] },
  { name: "Bank Sumut", aliases: ["sumut", "bank sumatera utara"] },
  { name: "Bank Nagari", aliases: ["nagari", "bank sumbar"] },
  { name: "Bank Riau Kepri Syariah", aliases: ["brk", "bank riau", "bank riau kepri"] },
  { name: "Bank Jambi", aliases: ["jambi"] },
  { name: "Bank Sumsel Babel", aliases: ["sumsel babel", "bank sumsel"] },
  { name: "Bank Bengkulu", aliases: ["bengkulu"] },
  { name: "Bank Lampung", aliases: ["lampung"] },
  { name: "Bank Kalbar", aliases: ["kalbar", "bank kalimantan barat"] },
  { name: "Bank Kalsel", aliases: ["kalsel", "bank kalimantan selatan"] },
  { name: "Bank Kalteng", aliases: ["kalteng", "bank kalimantan tengah"] },
  { name: "Bankaltimtara", aliases: ["kaltimtara", "bank kaltim", "bankaltim"] },
  { name: "Bank Sulselbar", aliases: ["sulselbar", "bank sulsel"] },
  { name: "Bank SulutGo", aliases: ["sulutgo", "bank sulut"] },
  { name: "Bank Sulteng", aliases: ["sulteng"] },
  { name: "Bank Sultra", aliases: ["sultra"] },
  { name: "BPD Bali", aliases: ["bank bali", "bpd bali"] },
  { name: "Bank NTB Syariah", aliases: ["ntb", "bank ntb"] },
  { name: "Bank NTT", aliases: ["ntt"] },
  { name: "Bank Maluku Malut", aliases: ["bank maluku"] },
  { name: "Bank Papua", aliases: ["papua"] },
];

const norm = (v) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const LOOKUP = new Map();
for (const bank of BANKS) {
  LOOKUP.set(norm(bank.name), bank.name);
  for (const alias of bank.aliases) LOOKUP.set(norm(alias), bank.name);
}

// Ketikan bebas -> nama bank baku kalau cocok dengan nama/alias; selain itu
// dikembalikan apa adanya (bank yang tidak ada di daftar tetap diterima).
export function normalizeBankName(value) {
  const key = norm(value);
  return LOOKUP.get(key) ?? LOOKUP.get(key.replace(/^bank /, "")) ?? String(value ?? "").trim();
}
