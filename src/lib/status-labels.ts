const STATUS_LABELS: Record<string, string> = {
  PENGEMBALIAN_UANG: "Pengembalian uang",
  BARANG_PENGGANTI: "Barang pengganti",
  POTONGAN_TAGIHAN: "Potongan tagihan",
  Belum_diajukan: "Belum diajukan",
  Dalam_proses: "Dalam proses",
  Disetujui: "Disetujui",
  Ditolak: "Ditolak",
  Belum_diproses: "Belum diproses",
  Menunggu_pengembalian_dana: "Menunggu pengembalian dana",
  Dana_dikembalikan: "Dana dikembalikan",
  Dana_tetap_hak_penjual: "Dana tetap hak penjual",
  Belum_dapat_dipastikan: "Belum dapat dipastikan",
};

export function humanizeStatusLabel(value: string): string {
  if (!value) return value;
  const known = STATUS_LABELS[value];
  if (known) return known;
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
