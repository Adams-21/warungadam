# BRD BizManage v0.5

BRD v0.5 menggantikan v0.4 dan menjadi acuan SRS v0.4. Keputusan yang belum final ditulis sebagai asumsi sementara di bagian 8 untuk dikonfirmasi ke klien.

## 1. Pendahuluan

| Informasi | Keterangan |
| --- | --- |
| Nama sistem | BizManage, Sistem Kasir dan Manajemen Usaha |
| Versi dokumen | 0.5, Draft Revision |
| Dokumen terkait | SRS v0.4 |
| Status | Draft, menunggu review dan konfirmasi klien |

### 1.1 Latar belakang

Usaha membutuhkan satu sistem untuk mencatat penjualan, mengelola produk dan stok, membeli barang dari supplier, mencatat pengeluaran, dan memantau keuntungan. Pencatatan yang terpisah berisiko membuat data tidak konsisten, keuntungan salah hitung, dan riwayat transaksi sulit dilacak.

BizManage menyatukan aktivitas tersebut. Sistem mendukung penjualan offline dan marketplace (dicatat manual), pembelian barang dan bahan kemasan, serta perhitungan harga pokok penjualan (HPP).

### 1.2 Tujuan proyek

1. Mempermudah pencatatan penjualan offline dan marketplace.
2. Mempermudah pengelolaan produk, varian, dan persediaan.
3. Mempermudah pencatatan pembelian, penerimaan barang, dan pembayaran supplier.
4. Mencatat retur dan dampaknya terhadap stok serta keuangan.
5. Memisahkan persediaan bahan kemasan dari pengeluaran operasional.
6. Menghitung HPP, keuntungan, dan arus kas secara terpisah agar tidak terjadi hitung ganda.
7. Menyediakan dashboard dan laporan usaha.
8. Menyediakan dua akun pengelola dengan hak akses operasional setara.
9. Menyediakan riwayat aktivitas untuk penelusuran perubahan data.

### 1.3 Pengguna

| Pengguna | Role | Keterangan |
| --- | --- | --- |
| Pengelola 1 (pemilik usaha) | `PENGELOLA` | Hak akses operasional penuh, setara dengan Pengelola 2 |
| Pengelola 2 | `PENGELOLA` | Hak akses operasional penuh, setara dengan Pengelola 1 |

Setiap akun memakai kredensial sendiri sehingga aktivitas dapat ditelusuri per pengguna. Tidak ada hierarki Owner dan Kasir. Mekanisme administrasi akun dibahas di TBD-19.

## 2. Gambaran Sistem

BizManage adalah aplikasi web satu usaha dengan sebelas modul: autentikasi dan pengguna, kasir dan transaksi, produk dan stok, supplier dan pembelian, retur, pengeluaran operasional, persediaan bahan kemasan, dashboard, riwayat, laporan, dan pengaturan.

Penjualan marketplace dicatat manual berdasarkan informasi dari marketplace. Sistem tidak mengambil pesanan atau stok secara otomatis.

### Alur utama

1. Pengelola memasukkan data produk, varian, dan supplier.
2. Pengelola mencatat pembelian barang dan bahan kemasan.
3. Stok bertambah berdasarkan barang yang dicatat diterima.
4. Pengelola mencatat penjualan offline atau marketplace beserta pemakaian bahan kemasan.
5. Sistem menyimpan harga jual dan HPP pada saat transaksi.
6. Pengelola mencatat retur, pembayaran supplier, pencairan dana marketplace, dan pengeluaran operasional.
7. Sistem memperbarui dashboard dan laporan.

## 3. Kebutuhan Bisnis per Modul

Sebelas modul berikut sama dengan modul di SRS v0.4. Hal yang masih terbuka diberi rujukan TBD.

### A. Autentikasi dan Pengguna

- Dua akun awal dengan role `PENGELOLA` dan hak akses setara.
- Login dan logout dengan kredensial masing-masing.
- Pengelolaan akun: ganti password dan pemulihan akses (TBD-19).
- Aktivitas penting mencatat pengguna dan waktu.

### B. Kasir dan Transaksi

- Mencatat penjualan offline dan marketplace (manual).
- Memilih produk lewat pencarian atau barcode, mengisi jumlah, menghitung subtotal dan total.
- Mencatat kanal penjualan, nomor transaksi atau resi, dan tanggal.
- Mencatat diskon dan biaya tambahan (TBD-13) serta biaya marketplace (TBD-04).
- Mencatat tiga kelompok status: pesanan, pembayaran, dan pencairan dana (TBD-14).
- Pembatalan transaksi tanpa menghapus jejak (TBD-11).
- Menyimpan harga jual dan HPP setiap item saat transaksi.
- Mencatat pemakaian bahan kemasan; biayanya masuk HPP transaksi.
- Cetak nota bila diperlukan (TBD-24).

### C. Produk dan Stok

- Menambah, mengubah, mencari, dan menonaktifkan produk.
- Produk memiliki beberapa varian, masing-masing dengan barcode, satuan, harga jual, dan stok (TBD-01, TBD-02).
- Kategori produk dapat dikelola.
- Harga jual dapat berbeda per kanal (TBD-05).
- Riwayat harga beli tersimpan.
- Stok berubah dari penerimaan pembelian, penjualan, retur, dan penyesuaian manual (alasan opsional).
- Peringatan stok rendah berdasarkan batas minimum (TBD-22).
- Aturan stok tidak mencukupi (TBD-09) dan waktu pengurangan stok (TBD-10).

### D. Supplier dan Pembelian

- Mengelola supplier (alamat opsional) dan menghubungkannya dengan varian produk (TBD-25).
- Satu pembelian berisi beberapa barang dengan kuantitas dan harga beli.
- Status pembelian dari draf sampai diterima.
- Penerimaan barang, termasuk penerimaan sebagian (TBD-08).
- Pembelian tunai dan tempo, tanggal jatuh tempo (TBD-17), pembayaran bertahap, dan koreksi pembayaran (TBD-12).
- Retur ke supplier (TBD-18).

### E. Retur Barang

- Mencatat retur pelanggan yang terhubung ke transaksi asal, termasuk retur sebagian.
- Mencatat kondisi barang (layak jual atau rusak), alasan, dan penanganan barang rusak (TBD-07).
- Mencatat status klaim marketplace dan status dana secara terpisah (TBD-06).
- Mencatat dampak retur terhadap stok, penjualan, refund, HPP, dan kerugian.

### F. Pengeluaran Operasional

- Mencatat biaya operasional (parkir, transportasi, listrik, dan lainnya) dengan kategori yang dapat dikelola (TBD-21).
- Koreksi atau pembatalan pengeluaran dengan riwayat (TBD-12).
- Pengeluaran operasional tidak masuk HPP.

### G. Persediaan Bahan Kemasan

- Mencatat pembelian bahan kemasan (kardus, bubble wrap, lakban, plastik, kertas nota) sebagai penambahan persediaan (TBD-15).
- Mengelola stok, satuan beli dan satuan pakai, penyesuaian stok, dan batas minimum.
- Mencatat pemakaian per transaksi dan menghitung biayanya (TBD-03, TBD-16).

### H. Dashboard

- Penjualan, pengeluaran operasional, keuntungan, stok produk dan kemasan, tagihan supplier (termasuk yang terlambat), dan transaksi yang belum selesai.

### I. Riwayat

- Riwayat penjualan, pembelian, penerimaan, pembayaran, retur, perubahan stok produk dan kemasan, status transaksi, dan aktivitas pengguna.
- Pencarian dan filter berdasarkan tanggal dan informasi transaksi.

### J. Laporan

- Laporan penjualan, pembelian, pengeluaran operasional, persediaan produk, persediaan kemasan, HPP, keuntungan, pembayaran dan utang supplier, retur, serta arus kas.
- Laporan membedakan arus kas, nilai persediaan, HPP, dan keuntungan agar tidak terjadi hitung ganda.
- Periode dan ekspor laporan (TBD-23).

### K. Pengaturan Sistem

- Informasi usaha, kanal penjualan (TBD-20), kategori produk dan pengeluaran (TBD-21), satuan, dan batas stok minimum (TBD-22).

## 4. Daftar Kebutuhan Bisnis

Setiap BR dipetakan ke requirement di SRS v0.4 (bagian Matriks Keterlacakan). ID BR dipakai hanya untuk kebutuhan bisnis; aturan bisnis memakai ID BRULE.

| ID | Kebutuhan bisnis | Modul |
| --- | --- | --- |
| BR-001 | Sistem mendukung pencatatan penjualan offline dan marketplace. | B |
| BR-002 | Sistem menyediakan pencatatan transaksi terstruktur lengkap dengan status, pembatalan, dan nota. | B |
| BR-003 | Sistem mempertahankan harga jual dan HPP historis pada transaksi yang sudah terjadi. | B |
| BR-004 | Sistem mendukung produk dengan beberapa varian. | C |
| BR-005 | Sistem mendukung pengelolaan dan pemindaian barcode. | B, C |
| BR-006 | Sistem mendukung hubungan varian produk dengan beberapa supplier. | C, D |
| BR-007 | Sistem mencatat pembelian dan menambah stok berdasarkan barang yang diterima. | D |
| BR-008 | Sistem mendukung pembelian tempo dan pembayaran bertahap. | D |
| BR-009 | Sistem mencatat retur pelanggan dan supplier serta dampaknya terhadap stok dan keuangan. | D, E |
| BR-010 | Sistem memisahkan persediaan bahan kemasan dari pengeluaran operasional. | F, G |
| BR-011 | Sistem menghitung HPP dari biaya barang dan bahan kemasan yang digunakan. | B, G |
| BR-012 | Sistem menyediakan dashboard dan laporan penjualan, pengeluaran, persediaan, dan keuntungan. | H, J |
| BR-013 | Sistem menyediakan dua akun awal dengan hak akses operasional setara. | A |
| BR-014 | Sistem mencatat riwayat aktivitas penting pengguna. | A, I |
| BR-015 | Sistem melindungi data historis dan tidak menghapus permanen data yang masih terkait transaksi. | B, C, D, F |
| BR-016 | Sistem mengelola stok produk: informasi stok, penyesuaian manual, dan peringatan stok rendah. | C |
| BR-017 | Sistem mencatat pengeluaran operasional dengan kategori dan koreksi yang terlacak. | F |
| BR-018 | Sistem menyediakan pengaturan usaha, kanal, kategori, satuan, dan batas stok. | K |
| BR-019 | Sistem mencatat biaya marketplace (komisi, biaya layanan, ongkir) sebagai komponen keuntungan. | B, J |
| BR-020 | Sistem menyediakan informasi arus kas dan utang supplier. | D, H, J |

## 5. Aturan Bisnis dan Prinsip Perhitungan

BRULE-001 sampai 020 dipertahankan dari BRD v0.4. BRULE-021 sampai 028 baru dan bertanda *(asumsi)* karena bergantung pada TBD yang belum dikonfirmasi klien.

| ID | Aturan |
| --- | --- |
| BRULE-001 | Setiap pengguna login dengan akun masing-masing. |
| BRULE-002 | Kedua akun `PENGELOLA` memiliki hak akses operasional setara. |
| BRULE-003 | Produk yang punya riwayat transaksi tidak dihapus permanen; hanya dinonaktifkan. |
| BRULE-004 | Supplier yang punya riwayat pembelian tidak dihapus permanen; hanya dinonaktifkan. |
| BRULE-005 | Perubahan harga produk tidak mengubah harga pada transaksi lama. |
| BRULE-006 | Perubahan harga beli dapat ditelusuri melalui riwayat pembelian. |
| BRULE-007 | Stok barang bertambah berdasarkan barang yang benar-benar diterima, bukan saat pembelian dibuat. |
| BRULE-008 | Pembelian tempo memiliki catatan tagihan dan pembayaran. |
| BRULE-009 | Pembayaran bertahap dicatat sebagai pembayaran terpisah. |
| BRULE-010 | Retur pelanggan dapat ditelusuri ke transaksi penjualan asal jika tersedia. |
| BRULE-011 | Barang retur layak jual dapat kembali ke stok layak jual setelah pemeriksaan. |
| BRULE-012 | Barang retur rusak tidak menambah stok layak jual. |
| BRULE-013 | Status klaim marketplace dibedakan dari status pencairan dana. |
| BRULE-014 | Pembelian bahan kemasan menambah persediaan bahan kemasan. |
| BRULE-015 | Biaya bahan kemasan masuk HPP ketika bahan digunakan pada transaksi. |
| BRULE-016 | Pengeluaran operasional dicatat terpisah dari persediaan dan HPP. |
| BRULE-017 | HPP yang dipakai pada transaksi disimpan sebagai nilai historis. |
| BRULE-018 | Pembatalan atau koreksi tidak menghapus jejak aktivitas sebelumnya. |
| BRULE-019 | Perubahan stok manual mencatat pengguna, waktu, dan alasan jika diisi. |
| BRULE-020 | Pembelian, pembayaran, dan pengeluaran dikoreksi melalui pembatalan atau penyesuaian yang punya riwayat. |
| BRULE-021 | Stok produk dan bahan kemasan tidak boleh menjadi negatif. *(asumsi, TBD-09)* |
| BRULE-022 | Stok penjualan offline berkurang saat transaksi disimpan; penjualan marketplace berkurang saat pesanan dicatat; pembatalan mengembalikan stok. *(asumsi, TBD-10)* |
| BRULE-023 | Harga jual dapat berbeda per kanal dan dapat diubah pada saat transaksi. *(asumsi, TBD-05)* |
| BRULE-024 | Biaya marketplace dicatat terpisah dari HPP dan mengurangi keuntungan. *(asumsi, TBD-04)* |
| BRULE-025 | Status pesanan, status pembayaran, dan status pencairan dana dicatat terpisah. *(asumsi, TBD-14)* |
| BRULE-026 | Tagihan supplier disebut terlambat jika lewat tanggal jatuh tempo dan sisa tagihan lebih dari nol. *(asumsi, TBD-17)* |
| BRULE-027 | HPP dihitung dengan metode rata-rata tertimbang bergerak untuk barang dan bahan kemasan. *(asumsi, TBD-03)* |
| BRULE-028 | Kuantitas dan biaya per satuan memakai desimal; nilai biaya yang disimpan ke transaksi dibulatkan ke Rupiah terdekat per baris. *(asumsi, TBD-16)* |

### Prinsip perhitungan keuangan (usulan)

Rumus berikut dipakai sebagai dasar laporan dan dashboard sampai klien mengonfirmasi TBD terkait.

| Ukuran | Rumus |
| --- | --- |
| Total transaksi | Subtotal item − diskon + biaya tambahan dari pelanggan |
| Penjualan neto | Total transaksi − refund kepada pelanggan |
| HPP barang | Jumlah (kuantitas × HPP per satuan saat transaksi) − HPP barang retur layak jual yang kembali ke stok |
| Biaya kemasan | Jumlah (kuantitas pakai × biaya per satuan pakai), dibulatkan per baris |
| Laba kotor | Penjualan neto − HPP barang − biaya kemasan |
| Laba bersih | Laba kotor − biaya marketplace − pengeluaran operasional − penghapusan persediaan |
| Arus kas masuk | Pembayaran penjualan offline dan dana marketplace yang benar-benar cair, menurut tanggal diterima |
| Arus kas keluar | Pembayaran supplier, pembelian kemasan, pengeluaran operasional, dan refund, menurut tanggal dibayar |

Catatan agar tidak terjadi hitung ganda:

- Pembelian barang dan kemasan mengurangi kas, tetapi baru menjadi biaya (HPP) ketika barang terjual atau kemasan dipakai.
- Barang retur rusak masuk stok rusak bernilai nol karena biayanya sudah ada di HPP saat dijual; hanya penghapusan persediaan yang tidak berasal dari retur yang masuk ke laba bersih.

## 6. Ruang Lingkup Proyek

### 6.1 Termasuk dalam ruang lingkup

1. Penjualan offline dan marketplace (manual), termasuk status, pembatalan, dan nota.
2. Produk, varian, kategori, barcode, dan stok.
3. Supplier, pembelian, penerimaan barang, dan pembayaran supplier.
4. Retur pelanggan dan retur supplier.
5. Persediaan bahan kemasan.
6. Pengeluaran operasional.
7. Perhitungan HPP, keuntungan, dan arus kas.
8. Dashboard, riwayat, dan laporan.
9. Dua akun pengelola dengan hak akses setara.
10. Pengaturan sistem.

### 6.2 Di luar ruang lingkup

1. Integrasi otomatis dengan API marketplace.
2. Sinkronisasi stok marketplace.
3. Aplikasi khusus pelanggan.
4. Payment gateway milik sistem sendiri.
5. Penggajian karyawan.
6. Integrasi otomatis dengan layanan pengiriman.
7. Pengelolaan kurir internal.
8. Akuntansi perusahaan berskala kompleks (neraca, pajak).
9. Sinkronisasi antarplatform marketplace.
10. Banyak cabang usaha.
11. Fitur lain di luar kebutuhan yang disepakati.

## 7. Kebutuhan Nonfungsional, Asumsi, dan Ketergantungan

### 7.1 Kebutuhan nonfungsional

| Aspek | Kebutuhan |
| --- | --- |
| Kemudahan penggunaan | Antarmuka mudah dipahami pengguna non-teknis; pencatatan transaksi dibuat sesederhana mungkin. |
| Keamanan | Autentikasi wajib, password disimpan sebagai hash, setiap akun punya kredensial sendiri, otorisasi diperiksa di server. |
| Konsistensi data | Transaksi, stok, pembayaran, persediaan kemasan, dan laporan harus konsisten; pengiriman ganda tidak membuat transaksi ganda. |
| Kinerja | Halaman operasional harian terasa lancar; target angka diusulkan di SRS (NFR-004) dan dikonfirmasi saat pengujian. |
| Kompatibilitas | Browser dan perangkat target ditentukan sebelum implementasi (TBD-24). |
| Pemeliharaan | Struktur memungkinkan perbaikan dan pengembangan tanpa merusak data historis. |

### 7.2 Asumsi dan ketergantungan

1. Data marketplace dimasukkan manual oleh pengelola dan tidak disinkronkan otomatis.
2. Pengelola bertanggung jawab atas kebenaran data yang dimasukkan.
3. HPP bergantung pada data harga beli dan pemakaian bahan kemasan.
4. Status pembayaran dan pencairan marketplace dapat berubah mengikuti proses di marketplace.
5. Sistem digunakan untuk satu usaha dengan koneksi internet.
6. Aturan yang berstatus TBD memerlukan keputusan klien; sebelum itu dokumen memakai asumsi sementara di bagian 8.
7. Teknologi dan infrastruktur ditentukan pada tahap perancangan teknis.

## 8. Asumsi Sementara dan Pertanyaan untuk Klien

Setiap TBD punya pertanyaan untuk klien dan asumsi sementara. Dokumen ini dan SRS v0.4 ditulis memakai asumsi tersebut; jika klien menjawab berbeda, hanya requirement yang dirujuk TBD terkait yang perlu direvisi. Lima TBD yang paling memengaruhi struktur database adalah TBD-01, 03, 04, 06, dan 10.

| ID | Topik | Pertanyaan untuk klien | Asumsi sementara |
| --- | --- | --- | --- |
| TBD-01 | Stok varian | Apakah stok tiap varian (800 ml, 1 liter, 2 liter, botol) dihitung sendiri-sendiri atau saling terhubung lewat konversi? | Stok mandiri per varian, tanpa konversi otomatis. Pindah stok antarvarian dilakukan lewat penyesuaian stok. |
| TBD-02 | Satuan produk | Apa saja satuan jual yang dipakai (botol, liter, pouch, pak)? Apakah "botol" adalah varian atau satuan? | Satuan melekat pada varian; "botol" diperlakukan sebagai salah satu varian. |
| TBD-03 | Metode HPP | Apakah HPP memakai harga beli terakhir, rata-rata, atau urutan masuk (FIFO)? | Rata-rata tertimbang bergerak, dihitung setiap ada penerimaan barang atau pembelian kemasan. |
| TBD-04 | Biaya marketplace | Apakah komisi, biaya layanan, dan ongkir ingin dicatat per pesanan? Siapa yang menanggung ongkir? | Dicatat per pesanan marketplace sebagai biaya terpisah (bukan HPP) yang mengurangi laba bersih. |
| TBD-05 | Harga per kanal | Apakah harga jual di Shopee, Tokopedia, dan offline bisa berbeda? | Ya. Harga default per varian, dapat diatur khusus per kanal dan diubah saat transaksi. |
| TBD-06 | Retur marketplace dan dana | Saat klaim barang rusak disetujui atau ditolak, kapan dan berapa dana yang diterima? | Disetujui: dana tetap diterima penjual. Ditolak: dana dikembalikan ke pelanggan (refund). Status klaim dan status dana dicatat terpisah. |
| TBD-07 | Barang rusak | Barang rusak disimpan atau langsung dibuang? | Dicatat sebagai stok rusak terpisah (tidak dijual), dapat dihapuskan dengan alasan. |
| TBD-08 | Penerimaan sebagian | Apakah pernah barang yang datang kurang dari pesanan? | Didukung: status Diterima sebagian, stok bertambah per penerimaan. |
| TBD-09 | Stok negatif | Boleh menjual saat stok di sistem 0? | Tidak boleh; sistem menolak dengan pesan. Koreksi stok dilakukan lewat penyesuaian. |
| TBD-10 | Waktu pengurangan stok | Kapan stok berkurang: saat pesanan masuk, dibayar, atau dikirim? | Offline: saat disimpan. Marketplace: saat pesanan dicatat. Dibatalkan: stok kembali. |
| TBD-11 | Pembatalan penjualan | Bagaimana jika pesanan dibatalkan, termasuk kemasan yang sudah terpakai? | Dibatalkan dengan alasan wajib; stok produk kembali; pemakaian kemasan tidak dikembalikan kecuali pengelola memilih. |
| TBD-12 | Koreksi data | Siapa yang boleh mengoreksi pembelian, pembayaran supplier, dan pengeluaran yang salah? | Kedua pengelola boleh; dilakukan lewat pembatalan atau penyesuaian dengan alasan, riwayat tetap ada. |
| TBD-13 | Diskon dan biaya tambahan | Apakah ada diskon per item atau per transaksi? Ada biaya tambahan dari pelanggan? | Diskon nominal per transaksi dan per item (opsional); biaya tambahan dari pelanggan masuk ke total transaksi. |
| TBD-14 | Status dan metode pembayaran | Apa saja metode bayar dan status pesanan yang dipakai? | Metode: tunai, transfer, QRIS, lainnya. Status pesanan: diproses, selesai, dibatalkan. Status pembayaran: belum dibayar, dibayar, dikembalikan. Status pencairan: belum cair, sebagian cair, sudah cair, tidak dicairkan (hanya marketplace). |
| TBD-15 | Pembelian kemasan | Apakah bahan kemasan selalu dibeli tunai atau kadang tempo? | Selalu tunai (langsung lunas); tidak ada utang kemasan. |
| TBD-16 | Pembulatan | Bahan dibeli per roll tetapi dipakai per meter: bagaimana aturannya? | Kuantitas dan biaya per satuan 4 desimal; biaya yang disimpan dibulatkan ke Rupiah terdekat per baris. Satuan beli dan satuan pakai punya faktor konversi. |
| TBD-17 | Jatuh tempo | Apakah pembelian tempo punya tanggal jatuh tempo? | Ya, opsional; tagihan terlambat jika lewat jatuh tempo dan belum lunas. |
| TBD-18 | Retur supplier | Retur ke supplier diganti barang, uang, atau potongan tagihan? | Ketiganya didukung sebagai hasil retur. |
| TBD-19 | Pengelolaan akun | Siapa yang membuat akun awal dan membantu jika lupa password? | Dua akun dibuat saat setup. Tiap pengguna dapat ganti password sendiri; reset password dilakukan pengelola lain. Tidak ada penambahan akun lewat antarmuka pada fase awal. |
| TBD-20 | Kanal penjualan | Apakah pengelola perlu menambah kanal sendiri? | Ya, pengelola dapat menambah, mengubah, dan menonaktifkan kanal. |
| TBD-21 | Kategori | Apakah kategori produk dan pengeluaran perlu diatur sendiri? | Ya, keduanya dapat dikelola di pengaturan. |
| TBD-22 | Batas stok minimum | Bagaimana batas stok minimum ditentukan? | Diisi manual per varian dan per bahan kemasan; kosong berarti tanpa peringatan. |
| TBD-23 | Laporan | Periode dan format laporan apa yang dibutuhkan? | Harian, bulanan, dan rentang bebas; ekspor ke CSV dan cetak lewat browser. |
| TBD-24 | Perangkat, nota, offline | Perangkat dan browser apa yang dipakai? Perlu nota dan printer apa? Perlu bekerja tanpa internet? | Laptop atau PC dan Android dengan Chrome terbaru; barcode scanner USB; nota dicetak lewat browser; tidak ada mode offline. |
| TBD-25 | Supplier dan varian | Apakah harga beli berbeda per varian untuk supplier yang sama? | Ya; hubungan supplier dan harga beli berada di tingkat varian. |

## 9. Kriteria Penerimaan Bisnis

Proyek memenuhi kebutuhan bisnis apabila:

1. Kedua pengelola dapat login dengan akun masing-masing dan memakai semua fitur operasional.
2. Penjualan offline dan marketplace dapat dicatat beserta status, pembatalan, dan pemakaian kemasan.
3. Produk, varian, kategori, dan barcode dapat dikelola; barcode dapat dipakai di kasir.
4. Pembelian, penerimaan barang, dan pembayaran supplier (tunai, tempo, bertahap) dapat dicatat.
5. Stok berubah sesuai penerimaan, penjualan, retur, dan penyesuaian, dengan riwayat.
6. Retur pelanggan dan supplier dapat dicatat; status klaim terpisah dari status dana.
7. Persediaan bahan kemasan dapat dibeli, dipakai, dan dipantau; biayanya masuk HPP saat dipakai.
8. Pengeluaran operasional tercatat terpisah dari HPP dan kemasan.
9. Harga jual dan HPP historis tidak berubah ketika harga diperbarui.
10. Dashboard dan laporan, termasuk laporan keuntungan dan arus kas, konsisten dengan data transaksi.
11. Riwayat aktivitas penting dapat ditelusuri per pengguna.

Kriteria yang bergantung pada TBD berstatus *Blocked* sampai klien mengonfirmasi atau mengubah asumsi sementara.

## 10. Riwayat Perubahan Dokumen

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 0.4 | 12 November 2026 | Revisi konsistensi persediaan kemasan, HPP, aturan bisnis, ruang lingkup, dan TBD. |
| 0.5 | 13 November 2026 | Modul kemasan dipisah (11 modul); BR bertambah menjadi 20; ID aturan bisnis BRULE-001 sampai 028; prinsip perhitungan keuangan dan arus kas; TBD menjadi 25 butir dengan pertanyaan klien dan asumsi sementara; sinkron dengan SRS v0.4. |

**Status: Draft Revision, menunggu review dan konfirmasi klien.**
