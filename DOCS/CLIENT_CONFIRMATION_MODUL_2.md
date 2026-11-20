# CLIENT REQUIREMENTS CONFIRMATION

## BizManage — Semua Modul (Konsolidasi Konfirmasi Klien)

**Versi Dokumen:** 2.0  
**Tanggal Pembaruan Terakhir:** 20 November 2026  
**Dokumen Acuan:** BRD BizManage v0.8 & SRS BizManage v1.2  
**Status:** Confirmed by Client (Konsolidasi Lintas Modul)

---

## 1. Tujuan

Dokumen ini berisi hasil konsolidasi konfirmasi kebutuhan sistem dari klien (Bu Anisa) untuk **seluruh modul** pada aplikasi **BizManage** berdasarkan rangkaian diskusi dan keputusan bisnis dari tanggal 9 November 2026 hingga 20 November 2026.

Seluruh poin terkonfirmasi di bawah ini menjadi acuan resmi dalam penyusunan BRD v0.8, SRS v1.2, perancangan ERD, serta pengembangan sistem BizManage.

---

## 2. Hasil Konfirmasi Kebutuhan Lintas Modul

| No. | Modul / Area | Kebutuhan | Keputusan & Jawaban Klien | Tanggal Konfirmasi | Status |
|---|---|---|---|---|---|
| 1 | Produk & Stok | Varian produk & stok | Satu produk dapat memiliki beberapa varian kemasan atau ukuran (misal minyak pouch 800 ml, 1 liter, 2 liter, botol), dan stok setiap varian dikelola secara **independen** tanpa konversi stok otomatis antarvarian. | 9 & 18 Nov 2026 | Disetujui |
| 2 | Produk & Kasir | Input barcode | Sistem menyediakan input dan pencarian produk melalui scan barcode maupun ketik manual. | 9 Nov 2026 | Disetujui |
| 3 | Produk & Supplier | Supplier produk & alamat | Satu produk/varian dapat memiliki lebih dari satu supplier; informasi alamat supplier dapat disimpan, tetapi tidak wajib diisi (opsional). | 9 Nov 2026 | Disetujui |
| 4 | Produk & Pembelian | Riwayat harga beli & penerimaan barang | Sistem mencatat perubahan harga beli dari transaksi pembelian serta mendukung penerimaan barang **secara bertahap** (stok langsung bertambah sesuai kuantitas yang diterima). | 9 & 18 Nov 2026 | Disetujui |
| 5 | Produk & Stok | Peringatan stok & alasan mutasi | Sistem menyediakan notifikasi stok menipis dan pengurutan otomatis; penyesuaian stok manual menyediakan kolom alasan yang bersifat opsional. | 9 Nov 2026 | Disetujui |
| 6 | Master Data & Transaksi | Perlindungan data historis | Produk, supplier, maupun transaksi yang memiliki riwayat tidak dapat dihapus permanen, melainkan dinonaktifkan (atau dibatalkan berjejak). | 9 & 18 Nov 2026 | Disetujui |
| 7 | Kasir & Transaksi | Waktu pengurangan stok | Stok produk berkurang **ketika pesanan dikonfirmasi dan mulai diproses** (`Diproses`), bukan saat pesanan baru masuk (`Baru`), dan dipulihkan bila dibatalkan sebelum selesai. | 18 Nov 2026 | Disetujui |
| 8 | HPP & Persediaan | Metode perhitungan HPP produk | HPP produk dihitung otomatis menggunakan metode **FIFO (First In, First Out)** berdasarkan urutan penerimaan barang. | 18 Nov 2026 | Disetujui |
| 9 | Kasir & Laporan Keuangan | Biaya admin marketplace | Transaksi marketplace menghitung estimasi biaya admin default **22%** dari harga jual produk (untuk transaksi baru), digantikan oleh **biaya admin aktual** setelah dana diterima/diketahui (tidak dijumlahkan ganda), dan dicatat sebagai **pengurang Pemasukan Bersih (Penjualan Neto)**. | 18 & 19 Nov 2026 | Disetujui |
| 10 | Retur Barang | Retur pelanggan & supplier | Mendukung retur pelanggan (berreferensi transaksi asal, pemisahan barang layak jual vs rusak, pemisahan status klaim dan status dana) serta retur supplier. | 18 Nov 2026 | Disetujui |
| 11 | Kemasan & Kasir | Persediaan kemasan & Standar Ukuran Paket | Pembelian kemasan dicatat sebagai persediaan (bukan pengeluaran operasional). Pengemasan saat penjualan bersifat opsional dengan memilih **Standar Ukuran Paket** dinamis (`XS`, `S`, `M`, `L`, `XL`, `XXL`, dll.) yang paling mendekati. Jenis material kemasan (kardus, plastik, bubble wrap dalam `cm`, lakban dalam `cm`, stiker fragile, dll.) dapat ditambah/dikurangi, serta takaran pakai per ukuran maupun saat transaksi dapat disesuaikan dengan kondisi aktual. | 18 & 20 Nov 2026 | Disetujui |
| 12 | Arsitektur & Infrastruktur | Deployment lokal LAN & backup | Sistem di-hosting secara **lokal** pada komputer server usaha (aplikasi + PostgreSQL) dan diakses oleh **PC serta HP melalui jaringan Wi-Fi lokal (LAN)** tanpa ketergantungan koneksi internet, dilengkapi pencadangan database otomatis harian ke media penyimpanan fisik terpisah. | 19 Nov 2026 | Disetujui |

---

## 3. Referensi Standar Ukuran Paket Kemasan (Dikonfirmasi 20 November 2026)

Master kategori ukuran paket dan komposisi materialnya bersifat **dinamis** (dapat ditambah, diubah, atau dikurangi oleh pengelola). Data acuan awal dari klien:

| Kategori Ukuran | Dimensi Kardus (P × L × T) | Kardus (Rp) | Plastik (Rp) | Bubble (Rp) | Lakban (Rp) | Fragile (Rp) | Subtotal Standar (Rp) |
|---|---|---:|---:|---:|---:|---:|---:|
| **XS** | 15 × 10 × 8 cm | 1.500 | 250 | 1.250 | 150 | 72 | **3.222** |
| **S** | 20 × 15 × 10 cm | 2.000 | 300 | 1.875 | 210 | 120 | **4.505** |
| **M** | 30 × 20 × 15 cm | 2.500 | 350 | 2.500 | 300 | 168 | **5.818** |
| **L** | 40 × 30 × 20 cm | 3.500 | 400 | 3.750 | 390 | 240 | **8.280** |
| **XL** | 50 × 40 × 30 cm | 5.000 | 450 | 5.000 | 510 | 288 | **11.248** |
| **XXL** | 60 × 50 × 40 cm | 7.000 | 500 | 6.250 | 660 | 360 | **14.770** |

---

## 4. Ketentuan Sistem Berdasarkan Konsolidasi Konfirmasi

1. **Autentikasi & Pengguna:** Tersedia dua akun pengelola (`PENGELOLA`) dengan kredensial terpisah dan hak akses operasional yang setara penuh.
2. **Produk, Varian & Barcode:** Setiap produk dapat memiliki beberapa varian dengan barcode, satuan, harga jual, dan saldo stok independen tanpa konversi otomatis antarvarian.
3. **Supplier & Pembelian:** Satu transaksi pembelian dapat memuat banyak item; stok bertambah bertahap sesuai penerimaan barang; mendukung pembayaran tunai/tempo dan pencatatan utang supplier.
4. **Kasir, Penjualan & Biaya Admin Marketplace:** Pencatatan penjualan marketplace dan offline dilakukan secara manual; stok berkurang saat pesanan berstatus `Diproses`; biaya admin marketplace dihitung estimasi 22% lalu digantikan biaya aktual saat dana cair untuk menghasilkan **Pemasukan Bersih**.
5. **HPP Produk (FIFO) & HPP Kemasan Ukuran Paket:** HPP produk dihitung otomatis dengan metode FIFO; HPP kemasan dihitung berdasarkan **Standar Ukuran Paket** yang dipilih di kasir (opsional) dengan kemampuan penyesuaian kuantitas aktual material (misal satuan `cm`) maupun nominal akhir HPP kemasan.
6. **Retur & Pengeluaran Operasional:** Retur pelanggan memisahkan barang layak jual (kembali ke stok & mengurangi HPP bersih) vs rusak (stok rusak bernilai nol) serta memisahkan status klaim dan status dana; pengeluaran operasional dicatat terpisah dari pembelian persediaan dan biaya admin marketplace.
7. **Infrastruktur Lokal & Pencadangan:** Aplikasi dan database PostgreSQL berjalan pada server lokal usaha, diakses multi-perangkat (PC & HP) melalui Wi-Fi LAN tanpa internet, dengan backup otomatis harian ke perangkat penyimpanan fisik terpisah.

---

## 5. Catatan Pengembangan & Poin Konfirmasi Akhir

Beberapa detail teknis implementasi menggunakan rancangan default pada **SRS BizManage v1.2** dan akan dikunci pada migrasi database final, antara lain:
- Mekanisme otomatis pemotongan stok material kemasan saat pesanan diproses dan perhitungan rata-rata harga modal per satuan pakai (`cm`/`pcs`) dari riwayat pembelian kemasan *(konfirmasi akhir dikirim ke klien pada 20 November 2026)*.
- Detail operasional minor pada BRD v0.8 Bagian 8.2 (`TBD-02`, `TBD-05`, `TBD-09`, `TBD-11` s.d. `TBD-15`, `TBD-17`, `TBD-19` s.d. `TBD-23`, dan `TBD-25`).

---

## 6. Kesimpulan

Seluruh kebutuhan inti lintas modul pada proyek **BizManage** telah mendapatkan persetujuan dari klien.

Dengan demikian, dokumen **Client Requirements Confirmation (Semua Modul)** dinyatakan **Confirmed by Client** dan menjadi landasan resmi bagi **BRD BizManage v0.8**, **SRS BizManage v1.2**, serta penyusunan **ERD BizManage**.

---

**Dokumen:** Client Requirements Confirmation  
**Proyek:** BizManage  
**Cakupan:** Semua Modul (11 Modul Operasional)  
**Status:** Confirmed by Client