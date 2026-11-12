# WarungAdam - Requirement Tracker

Dokumen ini digunakan untuk memantau status kebutuhan sistem berdasarkan mind map, jawaban klien, dan keputusan teknis developer.

| Modul | Status | Catatan |
|---|---|---|
| 1. Kasir & Transaksi | Perlu review | Periksa kembali kebutuhan dari mind map |
| 2. Produk & Stok | Confirmed | 8 kebutuhan sudah dijawab klien |
| 3. Supplier & Pembelian | Confirmed sbgian besar | Pertanyaan sudah dikirim |
| 4. Retur Barang | Review | Menunggu pembahasan |
| 5. Pengeluaran | Review | Teknis masuk HPP, nonteknis masuk biaya operasional |
| 6. Dashboard | Draft | Rancangan awal dari kebutuhan yang tersedia |
| 7. Riwayat Transaksi & Pesanan | Draft | Rancangan awal dari kebutuhan yang tersedia |
| 8. Laporan | Draft | Rancangan laporan harian, mingguan, bulanan |
| 9. Pengaturan Sistem | Draft | Rancangan pengaturan dasar |
| 10. Hak Akses Pengguna | Confirmed sbgian | Menunggu kepastian jumlah pengguna |

## Catatan Keputusan Teknis

- Metode Query menjadi pendekatan utama untuk pengolahan laporan.
- Stream dipertimbangkan untuk pemrosesan data besar.
- Pengeluaran teknis diperhitungkan dalam HPP.
- Pengeluaran nonteknis dicatat sebagai biaya operasional.
- Keputusan teknis tidak perlu ditanyakan kepada klien kecuali berdampak pada proses bisnis.

## Prinsip Pengembangan

1. Tidak mengulang pertanyaan yang sudah dijawab klien.
2. Tidak mengunci asumsi yang belum dikonfirmasi.
3. Memisahkan kebutuhan bisnis dan keputusan teknis.
4. Memperbarui BRD dan SRS berdasarkan hasil konfirmasi.
5. Menjaga ruang lingkup proyek agar sesuai deadline akhir Januari 2027.