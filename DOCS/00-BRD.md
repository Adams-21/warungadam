# BRD BizManage v0.8

BRD v0.8 merupakan pembaruan terhadap v0.7.2 berdasarkan keputusan klien pada 20 November 2026 terkait mekanisme **Standar Ukuran Paket Kemasan** (`XS`, `S`, `M`, `L`, `XL`, `XXL`, serta kategori ukuran dinamis lainnya), fleksibilitas penambahan/pengurangan jenis material kemasan, penyesuaian pemakaian aktual per ukuran maupun saat transaksi penjualan, dan penutupan `TBD-16`. Seluruh ketentuan lain dari v0.7.2 dipertahankan secara utuh, dan ketentuan yang belum memiliki keputusan final tetap ditulis sebagai `TBD` atau *Asumsi Sementara* di bagian 8.

## 1. Pendahuluan

| Informasi | Keterangan |
| --- | --- |
| Nama sistem | BizManage, Sistem Manajemen Keuangan dan Operasional Usaha Reseller |
| Versi dokumen | 0.8, Revised Draft |
| Dokumen terkait | BRD v0.7.2, SRS BizManage v1.1 |
| Status | Revised Draft, menunggu konfirmasi seluruh TBD terbuka pada bagian 8.2 sebelum penetapan baseline |

### 1.1 Latar belakang

Usaha reseller yang berjualan melalui berbagai kanal penjualan dan marketplace (seperti Shopee, Tokopedia, Lazada, maupun penjualan langsung/offline) membutuhkan satu sistem terpusat untuk mencatat pembelian barang, mengelola produk dan varian, memantau stok, mencatat penjualan, mengelola perlengkapan kemasan, serta menghitung harga pokok penjualan (HPP), pemasukan bersih, dan keuntungan. Pencatatan yang terpisah berisiko menimbulkan ketidakkonsistenan data, kesalahan perhitungan laba, serta kesulitan melacak arus kas dan potongan biaya marketplace.

BizManage menyatukan seluruh pencatatan keuangan dan operasional tersebut dalam satu sistem berbasis server lokal usaha, dengan fokus pada pencatatan manual yang akurat tanpa integrasi otomatis ke sistem marketplace dan tanpa ketergantungan pada koneksi internet untuk operasional harian.

### 1.2 Tujuan proyek

1. Mempermudah pencatatan penjualan dari berbagai marketplace dan kanal penjualan secara terstruktur.
2. Mempermudah pengelolaan produk, varian independen, dan persediaan barang.
3. Mempermudah pencatatan pembelian, penerimaan barang bertahap, dan pembayaran kepada supplier.
4. Mencatat retur pelanggan dan supplier beserta dampaknya terhadap stok dan keuangan.
5. Memisahkan pencatatan persediaan perlengkapan kemasan dari pengeluaran operasional agar tidak terjadi hitung ganda.
6. Menghitung HPP produk (FIFO), HPP kemasan berbasis standar ukuran paket maupun penyesuaian aktual, biaya admin marketplace (estimasi dan aktual sebagai pengurang pemasukan bersih), pemasukan bersih, keuntungan, serta arus kas secara akurat.
7. Menyediakan dashboard dan laporan keuangan usaha.
8. Menyediakan dua akun pengelola dengan hak akses operasional yang setara.
9. Menyediakan riwayat aktivitas serta pencadangan data otomatis harian pada media penyimpanan terpisah untuk menjaga keamanan data operasional lokal.

### 1.3 Pengguna

| Pengguna | Role | Keterangan |
| --- | --- | --- |
| Pengelola 1 | `PENGELOLA` | Hak akses operasional penuh, setara dengan Pengelola 2 |
| Pengelola 2 | `PENGELOLA` | Hak akses operasional penuh, setara dengan Pengelola 1 |

Setiap akun menggunakan kredensial masing-masing sehingga setiap aktivitas tercatat per pengguna. Sistem tidak menerapkan pembagian peran Owner dan Kasir. Mekanisme pemulihan akun mengacu pada TBD-19.

## 2. Gambaran Sistem

BizManage adalah aplikasi web yang di-hosting pada komputer server lokal milik usaha dan dapat diakses oleh perangkat PC maupun HP melalui jaringan Wi-Fi lokal (LAN) yang sama tanpa memerlukan koneksi internet untuk operasional harian. Sistem terdiri dari sebelas modul: autentikasi dan pengguna, kasir dan transaksi, produk dan stok, supplier dan pembelian, retur barang, pengeluaran operasional, persediaan perlengkapan kemasan, dashboard, riwayat, laporan, dan pengaturan sistem.

Seluruh transaksi marketplace dicatat secara manual berdasarkan data pesanan dan pencairan dari masing-masing marketplace. Sistem tidak melakukan sinkronisasi pesanan maupun stok otomatis dengan marketplace.

### Alur utama

1. Pengelola memasukkan data produk, varian, supplier, material kemasan, dan master standar ukuran paket.
2. Pengelola mencatat pembelian barang dagang dan perlengkapan kemasan.
3. Stok bertambah secara bertahap sesuai jumlah barang yang benar-benar diterima.
4. Pengelola mencatat transaksi penjualan (marketplace atau offline) dan dapat memilih standar ukuran paket kemasan yang paling mendekati secara opsional (serta menyesuaikan pemakaian material aktual bila diperlukan).
5. Ketika pesanan dikonfirmasi dan mulai diproses, sistem mengurangi stok barang (serta stok material kemasan jika digunakan) dan menetapkan HPP produk berdasarkan metode FIFO.
6. Sistem menghitung estimasi biaya admin marketplace sebesar 22% (default) dan memungkinkan penyesuaian ke biaya aktual setelah dana cair sebagai komponen pengurang pemasukan bersih.
7. Pengelola mencatat retur, pembayaran supplier, pencairan dana marketplace, dan pengeluaran operasional.
8. Sistem memperbarui dashboard dan laporan keuangan serta arus kas, serta menjalankan pencadangan database otomatis harian ke media penyimpanan terpisah.

## 3. Kebutuhan Bisnis per Modul

### A. Autentikasi dan Pengguna

- Menyediakan dua akun pengelola dengan role `PENGELOLA` dan hak akses setara.
- Login dan logout menggunakan kredensial masing-masing dari perangkat yang terhubung ke jaringan lokal (LAN).
- Fitur ganti password untuk pengguna yang sedang login; pemulihan akses mengacu pada TBD-19.
- Aktivitas penting mencatat identitas pengguna dan waktu kejadian.

### B. Kasir dan Transaksi

- Mencatat penjualan dari berbagai marketplace (Shopee, Tokopedia, Lazada, dan lainnya) serta penjualan langsung/offline secara manual.
- Memilih varian produk melalui pencarian atau barcode, mengisi jumlah, serta menghitung subtotal dan total transaksi.
- Mencatat kanal penjualan, nomor transaksi atau nomor resi, dan tanggal transaksi.
- Mencatat diskon dan biaya tambahan dari pelanggan (TBD-13).
- Menghitung estimasi biaya admin marketplace secara default sebesar 22% dari harga jual produk (berlaku untuk transaksi baru), serta menyediakan pencatatan biaya admin aktual yang terpisah setelah dana diterima atau potongan diketahui. Biaya admin tersebut menjadi pengurang pemasukan bersih.
- Mencatat tiga kelompok status secara terpisah: status pesanan, status pembayaran, dan status pencairan dana (TBD-14).
- Mengurangi stok barang saat pesanan dikonfirmasi dan mulai diproses (bukan saat pesanan baru dibuat), serta mengembalikan stok bila pesanan dibatalkan sebelum selesai (TBD-11).
- Menyimpan harga jual dan HPP historis setiap item pada saat transaksi diproses.
- Memilih **standar ukuran paket kemasan** yang paling mendekati pada transaksi secara opsional, memuat komposisi material standarnya, mengizinkan penyesuaian kuantitas pemakaian material maupun nominal HPP kemasan sesuai kondisi aktual, dan mencatat HPP kemasan per paket.
- Cetak nota transaksi melalui browser bila diperlukan.

### C. Produk dan Stok

- Menambah, mengubah, mencari, dan menonaktifkan produk.
- Satu produk dapat memiliki beberapa varian dengan stok independen (tanpa konversi otomatis antarvarian), masing-masing memiliki barcode, satuan, harga jual, dan jumlah stok (TBD-02).
- Kategori produk dapat dikelola.
- Harga jual dapat berbeda per kanal penjualan (TBD-05).
- Riwayat harga beli aktual tersimpan per transaksi dan lapisan pembelian untuk mendukung perhitungan HPP FIFO.
- Stok berubah berdasarkan penerimaan pembelian, pemrosesan pesanan penjualan, retur, dan penyesuaian stok manual (alasan opsional).
- Peringatan stok rendah berdasarkan batas minimum (TBD-22).
- Aturan pembatasan stok negatif mengacu pada TBD-09.

### D. Supplier dan Pembelian

- Mengelola data supplier (alamat opsional) dan menghubungkannya dengan varian produk *(asumsi sementara, menunggu konfirmasi TBD-25)*.
- Satu transaksi pembelian dapat berisi beberapa barang dengan kuantitas dan harga beli masing-masing.
- Status pembelian mulai dari draf hingga diterima penuh.
- Penerimaan barang mendukung penerimaan bertahap (sebagian); stok bertambah langsung sesuai jumlah barang yang diterima pada setiap penerimaan.
- Mendukung pembelian tunai dan tempo, tanggal jatuh tempo (TBD-17), pembayaran bertahap, serta koreksi pembayaran yang terlacak riwayatnya (TBD-12).
- Mendukung pencatatan retur ke supplier sesuai ketentuan yang berlaku.

### E. Retur Barang

- Mencatat retur pelanggan yang terhubung ke transaksi penjualan asal, termasuk retur sebagian.
- Mencatat kondisi barang retur (layak jual atau rusak), alasan retur, dan penanganan barang rusak (stok rusak terpisah yang dapat dihapuskan dengan alasan).
- Mencatat status klaim marketplace dan status pencairan dana retur secara terpisah.
- Mencatat dampak retur terhadap stok, pemasukan bersih, refund, HPP, dan kerugian barang rusak.

### F. Pengeluaran Operasional

- Mencatat pengeluaran operasional usaha (seperti parkir, transportasi, listrik, dan lainnya) dengan kategori yang dapat dikelola (TBD-21).
- Koreksi atau pembatalan pengeluaran tercatat dengan riwayat perubahan (TBD-12).
- Pengeluaran operasional dipisahkan dari persediaan serta biaya admin marketplace, dan tidak dimasukkan ke dalam HPP.

### G. Persediaan Perlengkapan Kemasan

- Mengelola master material perlengkapan kemasan secara dinamis (dapat ditambah, diubah, atau dikurangi, tidak terbatas pada 5 macam material saja seperti kardus, plastik, bubble wrap, lakban, stiker fragile, kertas nota, dll.) beserta satuan beli (misal roll/pak) dan satuan pakai (misal `cm`/`pcs`/`lembar`) serta faktor konversinya.
- Mengelola master **Standar Ukuran Paket** secara dinamis (contoh awal: `XS`, `S`, `M`, `L`, `XL`, `XXL` beserta dimensi kardus acuannya) yang masing-masing memuat daftar material penyusun dan takaran pakai standarnya, serta dapat disesuaikan komposisi maupun penggunaannya per ukuran.
- Mencatat pembelian perlengkapan kemasan sebagai penambahan persediaan dalam satuan pakai; mekanisme pembayaran tunai atau tempo mengacu pada TBD-15.
- Mengelola stok persediaan kemasan, penyesuaian stok, dan batas minimum (TBD-22).
- Mencatat penggunaan perlengkapan kemasan pada transaksi penjualan dengan memilih standar ukuran paket yang paling mendekati (bersifat opsional saat input transaksi), serta mendukung penyesuaian kuantitas pemakaian aktual material maupun nominal HPP kemasan di kasir.
- Menghitung biaya perlengkapan kemasan yang digunakan sebagai HPP kemasan per paket berdasarkan biaya satuan material dan pemakaian aktual (TBD-03B), dengan kemampuan penyesuaian nilai HPP kemasan jika diperlukan.
- Memastikan pembelian kemasan dan penggunaannya tidak dihitung sebagai beban biaya dua kali.

### H. Dashboard

- Menampilkan ringkasan pemasukan bersih (penjualan neto), pengeluaran operasional, laba kotor dan laba bersih, stok produk dan perlengkapan kemasan, tagihan supplier (termasuk yang melewati jatuh tempo), arus kas, serta daftar transaksi yang belum selesai.

### I. Riwayat

- Menyediakan riwayat penjualan, pembelian, penerimaan barang, pembayaran, retur, pergerakan stok produk dan kemasan, perubahan status transaksi, serta aktivitas pengguna.
- Mendukung pencarian dan filter berdasarkan rentang tanggal serta informasi transaksi.

### J. Laporan

- Menyediakan laporan penjualan (termasuk rincian penjualan bruto, refund, potongan admin marketplace, dan pemasukan bersih), pembelian, pengeluaran operasional, persediaan produk, persediaan kemasan, HPP (produk dan kemasan), keuntungan, pembayaran dan utang supplier, retur, serta arus kas.
- Memisahkan laporan arus kas, nilai persediaan, HPP, dan laba agar tidak terjadi perhitungan ganda.
- Mendukung filter periode dan ekspor laporan (TBD-23).

### K. Pengaturan Sistem

- Mengelola informasi usaha, kanal penjualan/marketplace (TBD-20), kategori produk dan pengeluaran (TBD-21), satuan, batas stok minimum (TBD-22), master standar ukuran paket beserta komposisi materialnya, serta nilai default estimasi biaya admin marketplace (22%).

## 4. Daftar Kebutuhan Bisnis

| ID | Kebutuhan bisnis | Modul |
| --- | --- | --- |
| BR-001 | Sistem mendukung pencatatan penjualan dari berbagai marketplace dan kanal offline secara manual. | B |
| BR-002 | Sistem menyediakan pencatatan transaksi terstruktur lengkap dengan pemisahan status pesanan, pembayaran, dan pencairan dana, pembatalan, serta cetak nota. | B |
| BR-003 | Sistem mempertahankan harga jual dan HPP historis pada transaksi yang sudah diproses. | B |
| BR-004 | Sistem mendukung produk dengan beberapa varian yang memiliki stok independen tanpa konversi otomatis. | C |
| BR-005 | Sistem mendukung pengelolaan dan pemindaian barcode pada produk dan transaksi. | B, C |
| BR-006 | *(Kebutuhan Sementara / Asumsi, TBD-25)* Sistem mendukung hubungan satu varian produk dengan beberapa supplier beserta harga beli acuan masing-masing; ketentuan ini masih menunggu konfirmasi eksplisit klien pada `TBD-25`. | C, D |
| BR-007 | Sistem mencatat pembelian dan menambah stok secara bertahap sesuai kuantitas barang yang diterima. | D |
| BR-008 | Sistem mendukung pembelian tempo dan pembayaran bertahap. | D |
| BR-009 | Sistem mencatat retur pelanggan dan supplier beserta dampaknya terhadap stok dan keuangan. | D, E |
| BR-010 | Sistem memisahkan persediaan perlengkapan kemasan dari pengeluaran operasional untuk mencegah hitung ganda, dengan master material kemasan dinamis dan konversi satuan beli ke satuan pakai. | F, G |
| BR-011 | Sistem menghitung HPP produk menggunakan metode FIFO dan HPP kemasan per paket berdasarkan standar ukuran paket serta pemakaian aktual secara terpisah. | B, C, G |
| BR-012 | Sistem menyediakan dashboard dan laporan penjualan, pemasukan bersih, pengeluaran, persediaan, dan keuntungan. | H, J |
| BR-013 | Sistem menyediakan dua akun awal dengan peran `PENGELOLA` dan hak akses operasional setara. | A |
| BR-014 | Sistem mencatat riwayat aktivitas penting pengguna. | A, I |
| BR-015 | Sistem melindungi data historis dan tidak menghapus permanen data yang masih terkait transaksi. | B, C, D, F |
| BR-016 | Sistem mengelola stok produk: pengurangan stok saat pesanan dikonfirmasi/diproses, penyesuaian manual, dan peringatan stok rendah. | B, C |
| BR-017 | Sistem mencatat pengeluaran operasional dengan kategori dan koreksi yang terlacak. | F |
| BR-018 | Sistem menyediakan pengaturan usaha, kanal penjualan, kategori, satuan, batas stok, master standar ukuran paket, dan default estimasi biaya admin. | K |
| BR-019 | Sistem mencatat dan membedakan estimasi biaya admin marketplace (default 22%) dengan biaya admin aktual sebagai komponen pengurang pemasukan bersih. | B, J |
| BR-020 | Sistem menyediakan informasi arus kas dan utang supplier. | D, H, J |
| BR-021 | Sistem menyediakan master standar ukuran paket yang dinamis (`XS`–`XXL`, dll.) beserta komposisi material fleksibel, pemilihan kemasan opsional pada transaksi, dan penyesuaian pemakaian aktual maupun nilai HPP kemasan per paket. | B, G, K |

## 5. Aturan Bisnis dan Prinsip Perhitungan

Aturan berlabel *(asumsi)* masih bergantung pada TBD yang belum dikonfirmasi klien.

| ID | Aturan | Status |
| --- | --- | --- |
| BRULE-001 | Setiap pengguna login menggunakan kredensial akun masing-masing. | Final |
| BRULE-002 | Kedua akun `PENGELOLA` memiliki hak akses operasional yang setara. | Final |
| BRULE-003 | Produk yang memiliki riwayat transaksi tidak dapat dihapus permanen; hanya dapat dinonaktifkan. | Final |
| BRULE-004 | Supplier yang memiliki riwayat pembelian tidak dapat dihapus permanen; hanya dapat dinonaktifkan. | Final |
| BRULE-005 | Perubahan harga jual produk tidak mengubah harga pada transaksi yang sudah tercatat. | Final |
| BRULE-006 | Perubahan harga beli aktual dapat ditelusuri melalui riwayat transaksi pembelian dan lapisan stok FIFO. | Final |
| BRULE-007 | Stok barang bertambah secara bertahap berdasarkan jumlah barang yang benar-benar diterima, bukan saat dokumen pembelian dibuat. | Final |
| BRULE-008 | Pembelian tempo memiliki catatan tagihan dan pelunasan. | Final |
| BRULE-009 | Pembayaran bertahap kepada supplier dicatat sebagai transaksi pembayaran terpisah. | Final |
| BRULE-010 | Retur pelanggan ditelusuri ke transaksi penjualan asal jika tersedia. | Final |
| BRULE-011 | Barang retur dengan kondisi layak jual dapat dikembalikan ke stok layak jual setelah pemeriksaan. | Final |
| BRULE-012 | Barang retur dengan kondisi rusak tidak menambah stok layak jual, melainkan dicatat sebagai stok rusak terpisah. | Final |
| BRULE-013 | Status klaim retur marketplace dibedakan dari status pencairan dana. | Final |
| BRULE-014 | Pembelian perlengkapan kemasan dicatat sebagai penambahan persediaan kemasan dalam satuan pakai, bukan langsung sebagai beban biaya. | Final |
| BRULE-015 | Perlengkapan kemasan bersifat opsional saat pencatatan transaksi melalui pemilihan standar ukuran paket yang paling mendekati; komposisi material per ukuran dapat ditambah/dikurangi dan kuantitas pemakaian aktual maupun nominal HPP kemasan per paket dapat disesuaikan sesuai kondisi aktual. | Final |
| BRULE-016 | Pengeluaran operasional dicatat terpisah dari persediaan serta biaya admin marketplace, dan tidak dimasukkan ke dalam HPP. | Final |
| BRULE-017 | HPP produk dan HPP kemasan yang dipakai pada transaksi disimpan sebagai nilai historis. | Final |
| BRULE-018 | Pembatalan atau koreksi transaksi tidak menghapus jejak aktivitas sebelumnya. | Final |
| BRULE-019 | Penyesuaian stok manual mencatat pengguna, waktu, dan alasan jika diisi. | Final |
| BRULE-020 | Pembelian, pembayaran, dan pengeluaran dikoreksi melalui mekanisme pembatalan atau penyesuaian yang memiliki riwayat. | Final |
| BRULE-021 | Stok setiap varian produk dikelola secara independen tanpa konversi stok otomatis antarvarian. | Final |
| BRULE-022 | HPP produk dihitung menggunakan metode FIFO (First In, First Out) berdasarkan urutan penerimaan barang. | Final |
| BRULE-023 | Stok produk berkurang ketika pesanan dikonfirmasi dan mulai diproses (bukan saat pesanan baru dibuat), dan dikembalikan jika pesanan dibatalkan sebelum selesai. | Final |
| BRULE-024 | Biaya admin marketplace dihitung secara estimasi dengan nilai default 22% dari harga jual produk saat transaksi baru dibuat, digantikan oleh biaya admin aktual setelah dana cair/diketahui (tidak pernah dijumlahkan keduanya), dan menjadi komponen pengurang pemasukan bersih. | Final |
| BRULE-025 | Stok produk dan perlengkapan kemasan tidak boleh bernilai negatif. *(asumsi, TBD-09)* | Asumsi Sementara |
| BRULE-026 | Harga jual dapat berbeda per kanal penjualan dan dapat diubah saat transaksi. *(asumsi, TBD-05)* | Asumsi Sementara |
| BRULE-027 | Status pesanan, status pembayaran, dan status pencairan dana dicatat terpisah. *(asumsi, TBD-14)* | Asumsi Sementara |
| BRULE-028 | Tagihan supplier berstatus terlambat jika melewati tanggal jatuh tempo dan sisa tagihan lebih dari nol. *(asumsi, TBD-17)* | Asumsi Sementara |
| BRULE-029 | Harga modal per satuan pakai perlengkapan kemasan dihitung otomatis menggunakan rata-rata biaya persediaan yang tersedia dari riwayat pembelian kemasan, dengan opsi penyesuaian manual pada master material. *(asumsi, TBD-03B)* | Asumsi Sementara |
| BRULE-030 | Kuantitas dan biaya satuan kemasan mendukung angka desimal (misal satuan `cm` untuk bubble wrap dan lakban); nilai HPP kemasan per paket dibulatkan ke Rupiah terdekat sebelum penyesuaian manual. | Final |

### Prinsip perhitungan keuangan

| Ukuran | Rumus |
| --- | --- |
| Total transaksi (Penjualan bruto) | `Subtotal item − diskon + biaya tambahan dari pelanggan` |
| Biaya admin marketplace | Menggunakan **biaya admin aktual** jika informasi pencairan/settlement sudah tersedia, atau **estimasi biaya admin (default 22% × harga jual produk)** jika biaya aktual belum tersedia. Keduanya tidak pernah dijumlahkan dan perubahan persentase estimasi tidak mengubah transaksi historis. |
| Pemasukan bersih (Penjualan neto) | `Total transaksi − refund kepada pelanggan − biaya admin marketplace` |
| HPP produk (FIFO) | `Jumlah (kuantitas × harga beli lapisan FIFO saat pesanan diproses) − HPP barang retur layak jual yang kembali ke stok` |
| HPP kemasan | `Jumlah (kuantitas pakai aktual tiap material × harga modal satuan pakai) dibulatkan ke Rupiah terdekat, atau nilai hasil penyesuaian manual per paket` |
| Laba kotor | `Pemasukan bersih − HPP produk (FIFO) − HPP kemasan` |
| Laba bersih | `Laba kotor − pengeluaran operasional − penghapusan persediaan` |
| Arus kas masuk | Pembayaran penjualan langsung/offline dan dana marketplace yang benar-benar cair, menurut tanggal dana diterima |
| Arus kas keluar | Pembayaran supplier, pembelian perlengkapan kemasan, pengeluaran operasional, dan refund pelanggan, menurut tanggal dibayar |

Catatan untuk mencegah hitung ganda:
- Biaya admin marketplace langsung mengurangi **Pemasukan bersih** (penjualan neto) dan tidak dicatat ulang sebagai pengeluaran operasional maupun pengurang terpisah di bawah laba kotor.
- Pembelian barang dagang dan perlengkapan kemasan mengurangi arus kas keluar saat dibayar, tetapi baru diakui sebagai biaya (HPP produk / HPP kemasan) ketika pesanan diproses dan perlengkapan kemasan digunakan.
- Barang retur rusak dicatat ke stok rusak dengan nilai persediaan nol karena biayanya telah diakui pada HPP saat penjualan terjadi; hanya penghapusan persediaan yang bukan berasal dari retur yang menjadi pengurang laba bersih.

### Referensi awal Standar Ukuran Paket Kemasan (Acuan Klien 20 November 2026)

Master kategori ukuran paket dan jenis material penyusunnya bersifat **dinamis** (dapat ditambah, diubah, atau dikurangi sewaktu-waktu oleh pengelola). Data acuan awal yang diberikan klien sebagai data awal sistem adalah sebagai berikut:

| Kategori Ukuran | Dimensi Kardus (P × L × T) | Kardus (Rp) | Plastik (Rp) | Bubble (Rp) | Lakban (Rp) | Fragile (Rp) | Subtotal Standar (Rp) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| XS | 15 × 10 × 8 cm | 1.500 | 250 | 1.250 | 150 | 72 | 3.222 |
| S | 20 × 15 × 10 cm | 2.000 | 300 | 1.875 | 210 | 120 | 4.505 |
| M | 30 × 20 × 15 cm | 2.500 | 350 | 2.500 | 300 | 168 | 5.818 |
| L | 40 × 30 × 20 cm | 3.500 | 400 | 3.750 | 390 | 240 | 8.280 |
| XL | 50 × 40 × 30 cm | 5.000 | 450 | 5.000 | 510 | 288 | 11.248 |
| XXL | 60 × 50 × 40 cm | 7.000 | 500 | 6.250 | 660 | 360 | 14.770[cite: 1, 2] |

## 6. Ruang Lingkup Proyek

### 6.1 Termasuk dalam ruang lingkup (MVP)

1. Pencatatan penjualan multi-marketplace (Shopee, Tokopedia, Lazada, dll.) dan kanal offline secara manual, termasuk status transaksi, pembatalan, dan cetak nota via browser.
2. Pengelolaan produk, varian dengan stok independen, kategori, barcode, dan stok.
3. Pengelolaan supplier, pembelian, penerimaan barang bertahap, dan pembayaran supplier.
4. Pencatatan retur pelanggan dan retur supplier.
5. Pengelolaan persediaan perlengkapan kemasan dinamis, master standar ukuran paket (`XS`–`XXL`, dll.) beserta komposisi materialnya, pemilihan standar ukuran paket opsional pada transaksi, serta penyesuaian pemakaian aktual dan HPP kemasan per paket.
6. Pencatatan pengeluaran operasional.
7. Perhitungan HPP produk (FIFO), estimasi & aktual biaya admin marketplace sebagai pengurang pemasukan bersih, laba kotor, laba bersih, dan arus kas.
8. Dashboard, riwayat aktivitas, dan laporan keuangan usaha.
9. Dua akun pengelola (`PENGELOLA`) dengan hak akses setara.
10. Pengaturan sistem (termasuk konfigurasi persentase default estimasi biaya admin marketplace dan pengelolaan master standar ukuran paket).
11. Deployment lokal pada komputer server usaha dengan akses multi-perangkat (PC dan HP) melalui jaringan Wi-Fi lokal (LAN) tanpa ketergantungan koneksi internet, disertai pencadangan database otomatis harian pada media penyimpanan terpisah dan prosedur pemulihan database.

### 6.2 Di luar ruang lingkup (Non-MVP)

1. Integrasi otomatis dengan API marketplace.
2. Sinkronisasi stok otomatis antar-marketplace.
3. Hosting cloud publik atau akses internet jarak jauh di luar jaringan lokal (LAN) usaha.
4. Pencadangan otomatis ke layanan cloud eksternal di luar media penyimpanan lokal terpisah yang dirancang.
5. Aplikasi khusus pembeli/pelanggan.
6. Payment gateway internal sistem.
7. Penggajian karyawan.
8. Integrasi otomatis dengan ekspedisi/layanan pengiriman.
9. Pengelolaan kurir internal.
10. Akuntansi perusahaan kompleks (neraca, laporan pajak).
11. Pengelolaan banyak cabang usaha.

## 7. Kebutuhan Nonfungsional, Asumsi, dan Ketergantungan

### 7.1 Kebutuhan nonfungsional

| Aspek | Kebutuhan |
| --- | --- |
| Kemudahan penggunaan | Antarmuka sederhana dan mudah dipahami pengguna non-teknis; pencatatan transaksi harian dibuat ringkas. |
| Keamanan | Autentikasi wajib, password disimpan dalam bentuk hash, setiap pengguna memakai kredensial sendiri, otorisasi diperiksa di server. |
| Konsistensi data | Perubahan transaksi, stok FIFO, persediaan kemasan, pembayaran, dan laporan harus konsisten; pengiriman formulir ganda tidak boleh memicu duplikasi transaksi. |
| Kinerja | Halaman operasional harian merespons cepat melalui jaringan lokal (LAN); target angka teknis ditentukan pada SRS dan diuji sebelum rilis. |
| Kompatibilitas & Akses Jaringan | Aplikasi di-hosting pada komputer server lokal dan diakses melalui browser modern pada PC/laptop maupun HP dalam satu jaringan Wi-Fi lokal (LAN) tanpa memerlukan koneksi internet; pencetakan nota menggunakan fitur cetak browser. |
| Pencadangan & Pemulihan Data | Database PostgreSQL **wajib** dicadangkan secara otomatis setiap hari melalui penjadwalan sistem. File hasil backup **wajib** disimpan pada **media penyimpanan terpisah** dari media penyimpanan database utama (bukan sekadar direktori berbeda pada media yang sama) sehingga kerusakan media database utama tidak otomatis menghilangkan seluruh file backup. Sistem wajib mencatat status keberhasilan maupun kegagalan proses backup pada log serta memiliki prosedur pemulihan (*recovery*) database yang terdokumentasi dan dapat diuji *(frekuensi pengujian pemulihan ditetapkan pada SRS)*. |
| Pemeliharaan | Struktur sistem menjaga keutuhan data historis saat dilakukan pembaruan aturan atau harga. |

### 7.2 Asumsi dan ketergantungan

1. Data pesanan, potongan aktual marketplace, dan pencairan dana dimasukkan secara manual oleh pengelola.
2. Pengelola bertanggung jawab atas keakuratan data yang diinput ke dalam sistem.
3. Akurasi perhitungan HPP FIFO bergantung pada kelengkapan dan urutan pencatatan penerimaan barang dari supplier.
4. Sistem dijalankan pada komputer lokal yang berfungsi sebagai server aplikasi dan database PostgreSQL, serta terhubung ke jaringan Wi-Fi lokal (LAN) usaha agar dapat diakses oleh perangkat PC dan HP tanpa ketergantungan koneksi internet.
5. Komputer server lokal dalam kondisi menyala pada jadwal pencadangan otomatis dan media penyimpanan terpisah untuk backup terpasang/tersedia agar proses backup harian berjalan sesuai jadwal.
6. Ketentuan yang masih berstatus `TBD` menggunakan *Asumsi Sementara* di bagian 8 hingga dikonfirmasi klien.

## 8. Keputusan Terkonfirmasi dan Daftar TBD / Asumsi Sementara

### 8.1 Keputusan yang Sudah Dikonfirmasi Klien (Terkunci)

| ID Asal | Topik | Keputusan Final Klien |
| --- | --- | --- |
| TBD-01 | Stok antarvarian | Stok setiap varian dikelola **independen**; tidak ada konversi stok otomatis antarvarian. |
| TBD-03 (Produk) | Metode HPP produk | Menggunakan metode **FIFO (First In, First Out)**. |
| TBD-04 | Biaya admin marketplace | Estimasi default **22%** dari harga jual produk (untuk transaksi baru); digantikan oleh **biaya aktual** saat dana diterima/diketahui (tidak dijumlahkan); dicatat sebagai **pengurang pemasukan bersih (penjualan neto)**. |
| TBD-06, 07, 18 | Ketentuan retur | Menggunakan ketentuan retur yang sudah ditetapkan pada dokumen ini (retur terhubung transaksi asal, pemisahan stok layak jual vs rusak, pemisahan status klaim dan status dana, serta dukungan retur supplier). Tidak diajukan pertanyaan ulang. |
| TBD-08 | Penerimaan barang | Stok bertambah **secara bertahap** sesuai jumlah barang yang diterima pada setiap penerimaan. |
| TBD-10 | Waktu pengurangan stok | Stok berkurang **ketika pesanan dikonfirmasi dan mulai diproses**, bukan saat pesanan baru dibuat. |
| TBD-15 (Aspek Persediaan & Pemakaian Kemasan) | Pencatatan persediaan & HPP kemasan per paket | **Terkonfirmasi terbatas pada perlakuan persediaan & pemakaian:** pembelian kemasan dicatat sebagai persediaan; pemilihan kemasan pada transaksi bersifat **opsional**; biaya kemasan dihitung sebagai **HPP kemasan per paket** yang **dapat disesuaikan**, tanpa hitung ganda. *(Catatan: metode pembayaran pembelian kemasan tunai vs tempo belum dikonfirmasi dan tetap terbuka pada `TBD-15` di bagian 8.2).* |
| TBD-16 | Standar ukuran paket, komposisi material, & konversi satuan kemasan | **Dikonfirmasi (20 November 2026):** Pengemasan pada transaksi penjualan menggunakan **Standar Ukuran Paket** (`XS`, `S`, `M`, `L`, `XL`, `XXL`, dll.) yang dipilih berdasarkan ukuran paling mendekati. Kategori ukuran paket dan daftar material penyusunnya bersifat **dinamis** (dapat ditambah/dikurangi). Bahan kemasan seperti bubble wrap dan lakban dihitung dalam satuan pakai (`cm`) hasil konversi dari satuan beli (roll/pak) dengan pembulatan ke Rupiah terdekat, serta penggunaan aktual per ukuran maupun di kasir dapat disesuaikan dengan kondisi aktual. |
| TBD-24 | Deployment, perangkat, dan koneksi | Sistem di-hosting secara **lokal** pada komputer server usaha (aplikasi + database PostgreSQL) dan dapat diakses oleh **PC dan HP melalui jaringan Wi-Fi lokal (LAN)** tanpa ketergantungan koneksi internet; tampilan dan cetak nota berjalan melalui browser modern. |

### 8.2 Daftar TBD dan Asumsi Sementara (Belum Final)

| ID | Topik | Hal yang Perlu Dikonfirmasi | Asumsi Sementara & Rancangan Teknis Sementara |
| --- | --- | --- | --- |
| TBD-02 | Satuan produk | Daftar satuan jual yang dipakai dan perlakuan istilah seperti "botol" atau "pak" (apakah sebagai varian atau satuan). | Satuan melekat pada masing-masing varian; perbedaan kemasan jual (misal botol 1L vs 2L) dicatat sebagai varian terpisah. |
| TBD-03B | Metode penetapan harga modal satuan kemasan | Metode pembaruan biaya per satuan pakai kemasan (`cm`/`pcs`) pada master material (apakah dihitung otomatis dari rata-rata harga pembelian kemasan atau diisi manual pada master material), menyusul konfirmasi atas skema standar ukuran paket 20 November 2026. | Menggunakan rata-rata biaya per satuan pakai dari riwayat pembelian kemasan yang tersedia (dengan opsi ubah manual pada master material), dan nilai HPP kemasan per paket selalu dapat disesuaikan manual pada transaksi. |
| TBD-05 | Harga jual per kanal | Apakah harga jual untuk varian yang sama bisa berbeda antara Shopee, Tokopedia, Lazada, dan offline. | Harga default per varian dapat diatur berbeda per kanal penjualan dan dapat diubah saat transaksi. |
| TBD-09 | Pembatasan stok negatif | Apakah sistem memblokir pemrosesan pesanan jika stok produk atau kemasan di sistem 0/kurang. | Sistem menolak pemrosesan jika stok tidak mencukupi; pengelola melakukan penyesuaian stok terlebih dahulu bila stok fisik tersedia. |
| TBD-11 | Pembatalan pesanan & kemasan | Bagaimana perlakuan stok kemasan jika pesanan yang sudah diproses kemudian dibatalkan. | Stok produk otomatis kembali ke persediaan asal; stok kemasan tidak otomatis kembali kecuali dipilih oleh pengelola. |
| TBD-12 | Otorisasi koreksi data | Apakah kedua pengelola memiliki wewenang penuh untuk membatalkan/mengoreksi pembelian, pembayaran, dan pengeluaran. | Kedua pengelola diperbolehkan melakukan koreksi melalui pembatalan/penyesuaian dengan alasan wajib dan riwayat tercatat. |
| TBD-13 | Diskon dan biaya tambahan | Jenis diskon (per item atau per transaksi) dan biaya tambahan dari pelanggan yang perlu dicatat. | Mendukung diskon nominal opsional per item maupun per transaksi, serta biaya tambahan yang menambah total transaksi. |
| TBD-14 | Rincian status & metode bayar | Daftar lengkap metode pembayaran dan rincian status pesanan, pembayaran, serta pencairan dana. | Metode: tunai, transfer, QRIS, lainnya. Status pesanan: baru, diproses, selesai, dibatalkan. Status pembayaran: belum dibayar, dibayar, dikembalikan. Status pencairan: belum cair, sebagian cair, sudah cair. |
| TBD-15 | Pembayaran pembelian perlengkapan kemasan (tunai vs tempo) | **Belum dikonfirmasi:** apakah pembelian perlengkapan kemasan selalu dibayar tunai atau dapat dilakukan secara tempo (utang) ke supplier. *(Aspek pencatatan persediaan dan pemakaian kemasan sudah dikunci di bagian 8.1).* | Sementara dianggap pembelian tunai (langsung lunas) tanpa pencatatan utang kemasan hingga dikonfirmasi klien. |
| TBD-17 | Jatuh tempo supplier | Apakah pembelian tempo wajib memiliki tanggal jatuh tempo untuk peringatan keterlambatan. | Tanggal jatuh tempo bersifat opsional; tagihan ditandai terlambat jika melewati tanggal jatuh tempo dan masih memiliki sisa tagihan. |
| TBD-19 | Pemulihan akses akun | Mekanisme reset password jika salah satu pengelola lupa password. | Tiap pengelola dapat mengubah password sendiri saat login; reset password akun yang lupa dibantu oleh pengelola lain. |
| TBD-20 | Pengelolaan kanal penjualan | Apakah pengelola dapat menambah/menonaktifkan kanal penjualan baru sendiri. | Ya, pengelola dapat menambah, mengubah, dan menonaktifkan kanal penjualan di menu pengaturan. |
| TBD-21 | Pengelolaan kategori | Apakah kategori produk dan kategori pengeluaran dapat ditambah/diubah sendiri. | Ya, kedua jenis kategori dapat dikelola melalui menu pengaturan. |
| TBD-22 | Batas stok minimum | Bagaimana penentuan batas stok minimum untuk peringatan stok rendah. | Diisi manual per varian produk dan per perlengkapan kemasan; jika dikosongkan maka peringatan tidak aktif. |
| TBD-23 | Format & periode laporan | Rentang periode dan format ekspor laporan yang dibutuhkan. | Mendukung filter harian, bulanan, dan rentang tanggal bebas, dengan ekspor ke CSV serta cetak lewat browser. |
| TBD-25 | Hubungan supplier dan varian (`BR-006`) | **Belum dikonfirmasi secara eksplisit:** apakah satu varian produk dapat dipasok oleh lebih dari satu supplier dengan harga beli acuan berbeda-beda per supplier, serta apakah pengelola membutuhkan pencatatan perubahan harga acuan di luar transaksi pembelian aktual. | **Asumsi & Rancangan Teknis Sementara:** Secara bisnis diasumsikan satu varian dapat memiliki banyak supplier dengan harga beli acuan masing-masing melalui rancangan sementara `VariantSuppliers` (bukan keputusan bisnis final), sedangkan riwayat harga beli aktual ditelusuri dari transaksi pembelian dan lapisan stok (`PurchaseItems` dan `StockBatches`) tanpa tabel riwayat harga acuan terpisah. |

## 9. Kriteria Penerimaan Bisnis

Proyek dinyatakan memenuhi kebutuhan bisnis apabila:

1. Kedua akun pengelola (`PENGELOLA`) dapat login dengan kredensial masing-masing dan mengakses seluruh fitur operasional secara setara.
2. Sistem dapat berjalan pada komputer server lokal dan diakses dari perangkat PC serta HP melalui jaringan Wi-Fi lokal (LAN) tanpa memerlukan koneksi internet.
3. Pencadangan database PostgreSQL berjalan otomatis setiap hari dan menyimpan file backup pada **media penyimpanan terpisah** dari media penyimpanan database utama (bukan sekadar direktori berbeda pada media yang sama), dilengkapi pencatatan status keberhasilan maupun kegagalan pada log serta prosedur pemulihan (*recovery*) database yang terdokumentasi dan dapat diuji *(frekuensi pengujian pemulihan ditetapkan pada SRS)*.
4. Penjualan dari berbagai marketplace dan kanal offline dapat dicatat lengkap dengan pemisahan status pesanan, pembayaran, dan pencairan dana.
5. Stok produk berkurang tepat ketika pesanan dikonfirmasi dan mulai diproses (bukan saat pesanan baru masuk), serta kembali ke lapisan asal apabila pesanan dibatalkan sebelum selesai.
6. Produk dan varian dapat dikelola dengan stok independen tanpa konversi otomatis antarvarian, serta mendukung pencarian dan pemindaian barcode.
7. Pembelian barang mendukung penerimaan bertahap dan langsung menambah lapisan stok sesuai kuantitas yang diterima.
8. HPP produk dihitung secara akurat menggunakan metode FIFO dan tersimpan sebagai nilai historis pada transaksi.
9. Estimasi biaya admin marketplace terhitung otomatis sebesar 22% (default) pada transaksi baru, dapat disesuaikan ke biaya admin aktual secara terpisah setelah dana diterima, dan mengurangi pemasukan bersih tanpa dijumlahkan ganda.
10. Pembelian perlengkapan kemasan masuk sebagai persediaan; master material dan master standar ukuran paket (`XS`–`XXL`, dll.) dapat dikelola secara dinamis; pemilihan standar ukuran paket pada transaksi bersifat opsional dengan penyesuaian pemakaian aktual maupun HPP kemasan per paket tanpa hitung ganda.
11. Retur pelanggan dan supplier tercatat lengkap beserta dampaknya terhadap stok layak jual/rusak, refund, pemasukan bersih, dan laba.
12. Pengeluaran operasional tercatat terpisah dari HPP, biaya admin marketplace, dan persediaan kemasan.
13. Dashboard dan laporan keuangan (pemasukan bersih, laba kotor, laba bersih, dan arus kas) konsisten dengan seluruh data transaksi.

## 10. Riwayat Perubahan Dokumen

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 0.4 | 12 November 2026 | Revisi konsistensi persediaan kemasan, HPP, aturan bisnis, ruang lingkup, dan TBD. |
| 0.5 | 13 November 2026 | Pemisahan modul kemasan (11 modul), penambahan BR dan BRULE, serta daftar 25 TBD. |
| 0.6 | 18 November 2026 | Pembaruan berdasarkan keputusan final klien: HPP produk FIFO, stok varian independen, pengurangan stok saat pesanan dikonfirmasi/diproses, estimasi biaya admin marketplace default 22% vs aktual, kemasan opsional pada transaksi dengan HPP kemasan per paket yang dapat disesuaikan, penerimaan barang bertahap, serta penguncian ketentuan retur. |
| 0.7 | 19 November 2026 | Pembaruan berdasarkan konfirmasi klien: penetapan biaya admin marketplace sebagai pengurang pemasukan bersih (penjualan neto); perubahan arsitektur deployment ke server lokal dengan akses multi-perangkat (PC & HP) melalui jaringan Wi-Fi lokal (LAN) tanpa ketergantungan internet; penutupan `TBD-24` ke keputusan terkonfirmasi; penambahan kewajiban pencadangan database otomatis harian. |
| 0.7.1 | 19 November 2026 | Koreksi konsistensi status akhir dokumen agar merujuk pada seluruh TBD terbuka di bagian 8.2; penguatan persyaratan pencadangan otomatis harian pada bagian 7.1, 7.2, dan 9 agar mewajibkan penyimpanan file backup pada media penyimpanan terpisah dari media database utama serta prosedur pemulihan terdokumentasi dan teruji; pemisahan tegas keputusan bisnis vs rancangan teknis pada `TBD-25`. |
| 0.7.2 | 19 November 2026 | Koreksi terbatas untuk menghilangkan kontradiksi antara `BR-006` dan `TBD-25` dengan menandai `BR-006` serta rancangan `VariantSuppliers` sebagai kebutuhan/rancangan sementara hingga `TBD-25` dikonfirmasi klien; pemisahan tegas pada `TBD-15` antara aspek persediaan/pemakaian kemasan yang sudah terkonfirmasi (bagian 8.1) dan metode pembayaran pembelian kemasan tunai vs tempo yang masih terbuka (bagian 8.2); penambahan catatan bahwa frekuensi pengujian recovery ditetapkan pada SRS. |
| 0.8 | 20 November 2026 | Pembaruan berdasarkan keputusan klien terkait pengemasan: penerapan **Standar Ukuran Paket** dinamis (`XS`, `S`, `M`, `L`, `XL`, `XXL`, dll.) beserta tabel acuan awal, fleksibilitas penambahan/pengurangan material kemasan dan penyesuaian pemakaian aktual per ukuran maupun saat penjualan, penambahan `BR-021`, pembaruan `BRULE-015`, `BRULE-029`, dan `BRULE-030`, serta penutupan `TBD-16` ke bagian 8.1. |

**Status: Revised Draft (v0.8), menunggu konfirmasi seluruh TBD yang masih terbuka pada bagian 8.2 sebelum penetapan baseline.**