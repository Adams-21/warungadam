# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Nama Proyek:** WarungAdam — Sistem Kasir dan Manajemen Usaha  
**Versi:** 0.2 — Draft Baseline  
**Tanggal:** 12 November 2026  
**Status:** Draft untuk Pengembangan dan Validasi Kebutuhan  
**Metodologi:** Agentic Engineering / The New SDLC

---

# 1. Pendahuluan

## 1.1 Tujuan Dokumen

Dokumen Software Requirements Specification (SRS) menjelaskan kebutuhan fungsional, kebutuhan nonfungsional, aturan bisnis, dan kriteria penerimaan sistem WarungAdam.

Dokumen ini menjadi acuan dalam proses perancangan database, antarmuka, arsitektur, implementasi, dan pengujian sistem.

## 1.2 Ruang Lingkup Sistem

WarungAdam merupakan sistem kasir dan manajemen usaha yang mencakup:

1. Kasir dan transaksi.
2. Produk dan stok.
3. Supplier dan pembelian.
4. Retur barang.
5. Pengeluaran.
6. Dashboard.
7. Riwayat transaksi dan pesanan.
8. Laporan.
9. Pengaturan sistem.
10. Hak akses pengguna.

## 1.3 Istilah

| Istilah | Keterangan |
|---|---|
| POS | Point of Sale atau sistem kasir |
| HPP | Harga Pokok Penjualan |
| SKU | Kode unik produk atau varian |
| Barcode | Kode identifikasi produk |
| Supplier | Pihak yang menyediakan barang |
| Retur | Pengembalian barang |
| Marketplace | Platform penjualan online |
| Audit Log | Riwayat aktivitas pengguna |
| Pengelola | Pengguna yang memiliki akses operasional sistem |
| Stok | Jumlah barang yang tersedia |

# 2. Gambaran Umum Sistem

## 2.1 Karakteristik Pengguna

Sistem digunakan oleh dua orang pengelola usaha.

Keduanya menggunakan akun terpisah dengan role yang sama, yaitu `PENGELOLA`.

Kedua akun memiliki hak akses setara terhadap seluruh fitur operasional.

Tidak terdapat pembagian hak akses Owner dan Kasir.

## 2.2 Lingkungan Penggunaan

Detail lingkungan implementasi ditentukan pada tahap perancangan teknis.

Sistem direncanakan dapat diakses melalui browser pada perangkat yang disepakati.

Kebutuhan penggunaan offline, jenis perangkat, dan dukungan printer masih perlu dikonfirmasi.

## 2.3 Asumsi Sistem

1. Sistem digunakan untuk satu usaha.
2. Terdapat dua akun pengelola pada kebutuhan awal.
3. Penjualan marketplace dicatat secara manual.
4. Sistem tidak melakukan sinkronisasi otomatis dengan marketplace.
5. Data transaksi yang dimasukkan pengguna menjadi dasar laporan.
6. Perubahan data penting harus memiliki riwayat.
7. Nilai uang disimpan dalam satuan Rupiah dengan tipe numerik yang aman untuk perhitungan.

# 3. Kebutuhan Fungsional

# 3.1 Modul Autentikasi dan Hak Akses

## FR-AUTH-001 — Autentikasi Pengguna

**Requirement:**

Sistem harus menyediakan autentikasi untuk dua akun pengguna yang memiliki peran sama, yaitu `PENGELOLA`.

**Acceptance Criteria:**

1. Sistem menyediakan dua akun pengguna terpisah.
2. Setiap pengguna dapat login menggunakan kredensial masing-masing.
3. Setiap pengguna dapat melakukan logout.
4. Sistem memvalidasi kredensial sebelum memberikan akses.
5. Password disimpan menggunakan metode hashing yang aman.
6. Pengguna yang belum login tidak dapat mengakses halaman yang membutuhkan autentikasi.

## FR-AUTH-002 — Hak Akses Setara

**Requirement:**

Kedua akun dengan role `PENGELOLA` harus memiliki hak akses yang setara terhadap seluruh fitur operasional.

**Acceptance Criteria:**

1. Kedua akun menggunakan role `PENGELOLA`.
2. Kedua akun dapat mengakses dashboard.
3. Kedua akun dapat melakukan transaksi penjualan.
4. Kedua akun dapat mengelola produk dan stok.
5. Kedua akun dapat mengelola supplier dan pembelian.
6. Kedua akun dapat mencatat retur.
7. Kedua akun dapat mencatat pengeluaran.
8. Kedua akun dapat melihat riwayat transaksi dan laporan.
9. Sistem tidak membedakan hak akses berdasarkan urutan pembuatan akun.
10. Pemeriksaan otorisasi dilakukan di sisi server.

## FR-AUTH-003 — Identifikasi Aktivitas Pengguna

**Requirement:**

Sistem harus mencatat identitas pengguna yang melakukan aktivitas penting.

**Acceptance Criteria:**

1. Transaksi penjualan menyimpan ID pengguna yang membuatnya.
2. Transaksi pembelian menyimpan ID pengguna yang membuatnya.
3. Pencatatan pengeluaran menyimpan ID pengguna yang membuatnya.
4. Perubahan stok menyimpan ID pengguna yang melakukannya.
5. Perubahan data penting menyimpan identitas pengguna dan waktu aktivitas.
6. Riwayat aktivitas dapat ditelusuri oleh kedua pengelola.
7. Riwayat transaksi tetap menyimpan identitas pelaku meskipun akun dinonaktifkan.

# 3.2 Modul Kasir dan Transaksi

## FR-SALE-001 — Pencatatan Transaksi Penjualan

**Requirement:**

Sistem harus menyediakan fitur untuk mencatat transaksi penjualan.

**Acceptance Criteria:**

1. Pengguna dapat membuat transaksi baru.
2. Pengguna dapat memilih produk yang tersedia.
3. Pengguna dapat memasukkan jumlah produk.
4. Sistem menghitung subtotal setiap produk.
5. Sistem menghitung total transaksi.
6. Sistem menyimpan waktu dan identitas pengguna yang membuat transaksi.
7. Sistem menghasilkan identitas transaksi yang unik.
8. Transaksi yang sudah tersimpan dapat dilihat pada riwayat transaksi.

## FR-SALE-002 — Penjualan Offline

**Requirement:**

Sistem harus mendukung pencatatan transaksi penjualan langsung melalui fitur kasir.

**Acceptance Criteria:**

1. Pengguna dapat memilih produk dari daftar produk.
2. Pengguna dapat memasukkan jumlah barang.
3. Sistem menghitung total transaksi.
4. Transaksi disimpan dengan kanal penjualan `OFFLINE`.
5. Sistem dapat menyediakan data transaksi untuk pencetakan nota apabila fitur cetak telah disetujui.

## FR-SALE-003 — Penjualan Online

**Requirement:**

Sistem harus mendukung pencatatan manual transaksi yang berasal dari marketplace.

**Acceptance Criteria:**

1. Pengguna dapat memilih kanal penjualan.
2. Sistem dapat menyimpan nama kanal marketplace.
3. Pengguna dapat memasukkan nomor transaksi atau nomor resi.
4. Pengguna dapat memilih produk yang dijual.
5. Pengguna dapat memasukkan jumlah produk.
6. Sistem menyimpan informasi transaksi.
7. Sistem tidak mengambil data pesanan secara otomatis dari marketplace.

**Catatan:** Daftar marketplace harus dapat disesuaikan dengan kanal yang digunakan usaha.

## FR-SALE-004 — Perhitungan Total Transaksi

**Requirement:**

Sistem harus menghitung total transaksi berdasarkan produk dan jumlah yang dimasukkan.

**Acceptance Criteria:**

1. Subtotal produk dihitung dari harga jual dikalikan jumlah barang.
2. Total transaksi merupakan hasil penjumlahan subtotal produk.
3. Diskon dan biaya tambahan hanya diterapkan apabila aturan tersebut telah disepakati.
4. Nilai transaksi lama tidak berubah ketika harga jual produk diperbarui.

## FR-SALE-005 — Pencatatan Bahan Kemasan

**Requirement:**

Sistem harus memungkinkan pengguna memilih bahan kemasan yang digunakan dalam transaksi.

**Acceptance Criteria:**

1. Pengguna dapat memilih bahan kemasan yang tersedia.
2. Pengguna dapat memasukkan jumlah bahan yang digunakan.
3. Sistem menghitung biaya bahan berdasarkan jumlah pemakaian.
4. Sistem menambahkan biaya pemakaian bahan kemasan ke dalam perhitungan HPP transaksi.
5. Sistem mengurangi stok bahan kemasan sesuai jumlah yang digunakan.
6. Sistem menyimpan riwayat pemakaian bahan kemasan.

## FR-SALE-006 — Status Transaksi

**Requirement:**

Sistem harus menyimpan status transaksi agar proses penjualan dapat ditelusuri.

**Acceptance Criteria:**

1. Sistem menyediakan status transaksi sesuai alur yang disepakati.
2. Perubahan status transaksi disimpan dalam riwayat.
3. Pembatalan transaksi tidak menghapus catatan transaksi awal.
4. Aturan final status transaksi masih perlu dikonfirmasi.

**Status sementara yang diusulkan:** Menunggu, Diproses, Selesai, dan Dibatalkan.

## FR-SALE-007 — Pembatalan dan Perubahan Transaksi

**Requirement:**

Sistem perlu mengatur pembatalan atau perubahan transaksi tanpa menghilangkan riwayat awal.

**Acceptance Criteria:**

1. Transaksi yang dibatalkan tetap memiliki catatan.
2. Sistem mencatat pengguna yang melakukan pembatalan.
3. Sistem mencatat waktu dan alasan pembatalan apabila diwajibkan.
4. Dampak pembatalan terhadap stok dan keuangan mengikuti aturan yang disepakati.

**Status:** Perlu konfirmasi klien.

# 3.3 Modul Produk dan Stok

## FR-PROD-001 — Pengelolaan Produk

**Requirement:**

Sistem harus menyediakan fitur untuk menambah, melihat, mengubah, dan menonaktifkan produk.

**Acceptance Criteria:**

1. Pengguna dapat menambahkan produk.
2. Pengguna dapat mengubah informasi produk.
3. Pengguna dapat melihat daftar produk.
4. Pengguna dapat mencari produk.
5. Produk yang memiliki riwayat transaksi tidak dapat dihapus permanen.
6. Produk dapat dinonaktifkan tanpa menghilangkan riwayat transaksi.

## FR-PROD-002 — Varian Produk

**Requirement:**

Sistem harus mendukung satu produk yang memiliki beberapa varian atau bentuk kemasan.

**Acceptance Criteria:**

1. Satu produk dapat memiliki beberapa varian.
2. Setiap varian dapat memiliki informasi identifikasi tersendiri.
3. Setiap varian dapat memiliki barcode.
4. Setiap varian dapat memiliki harga jual dan informasi stok.
5. Riwayat transaksi harus dapat menunjukkan varian yang dijual.

Contoh: Produk minyak dapat memiliki varian 800 ml, 1 liter, 2 liter, dan botol.

**Catatan:** Apakah stok setiap varian berdiri sendiri atau saling terhubung melalui konversi satuan masih perlu ditentukan pada desain teknis.

## FR-PROD-003 — Barcode Produk

**Requirement:**

Sistem harus mendukung input barcode melalui pemindaian maupun input manual.

**Acceptance Criteria:**

1. Pengguna dapat memasukkan barcode secara manual.
2. Pengguna dapat menggunakan perangkat pemindai barcode yang kompatibel.
3. Barcode digunakan untuk membantu mengidentifikasi produk atau varian.
4. Sistem memvalidasi agar barcode tidak digunakan secara tidak semestinya pada data produk yang berbeda.

## FR-PROD-004 — Pengelolaan Stok Produk

**Requirement:**

Sistem harus menyimpan jumlah stok setiap produk atau varian sesuai struktur stok yang ditetapkan.

**Acceptance Criteria:**

1. Pengguna dapat melihat jumlah stok.
2. Perubahan stok tercatat dalam riwayat.
3. Pembelian barang yang dikonfirmasi dapat menambah stok.
4. Penjualan mengurangi stok sesuai aturan waktu pengurangan yang disepakati.
5. Penyesuaian stok manual dapat dilakukan oleh pengelola.
6. Penyesuaian stok menyediakan kolom alasan yang bersifat opsional.

## FR-PROD-005 — Notifikasi Stok Rendah

**Requirement:**

Sistem harus memberikan informasi ketika stok produk mencapai batas minimum.

**Acceptance Criteria:**

1. Pengguna dapat menentukan batas stok minimum.
2. Sistem membandingkan stok saat ini dengan batas minimum.
3. Produk yang mencapai atau berada di bawah batas minimum ditandai.
4. Pengguna dapat melihat atau mengurutkan produk berdasarkan kondisi stok.

## FR-PROD-006 — Riwayat Harga Beli

**Requirement:**

Sistem harus mencatat perubahan harga beli produk.

**Acceptance Criteria:**

1. Sistem menyimpan harga beli yang tercatat pada pembelian.
2. Sistem mempertahankan riwayat harga sebelumnya.
3. Perubahan harga tidak mengubah data pembelian lama.
4. Data harga beli dapat dihubungkan dengan produk dan supplier terkait.

## FR-PROD-007 — Hubungan Produk dan Supplier

**Requirement:**

Satu produk dapat dihubungkan dengan lebih dari satu supplier.

**Acceptance Criteria:**

1. Produk dapat memiliki beberapa relasi supplier.
2. Supplier dapat menyediakan lebih dari satu produk.
3. Sistem menyimpan informasi harga beli berdasarkan riwayat pembelian.
4. Alamat supplier dapat disimpan secara opsional.

# 3.4 Modul Supplier dan Pembelian

## FR-SUP-001 — Pengelolaan Supplier

**Requirement:**

Sistem harus menyediakan fitur pengelolaan data supplier.

**Acceptance Criteria:**

1. Pengguna dapat menambahkan supplier.
2. Pengguna dapat mengubah data supplier.
3. Pengguna dapat melihat daftar supplier.
4. Data supplier dapat dicari.
5. Alamat supplier bersifat opsional.
6. Supplier yang memiliki riwayat pembelian tidak dihapus permanen, tetapi dapat dinonaktifkan.

## FR-PUR-001 — Pencatatan Pembelian

**Requirement:**

Sistem harus menyediakan fitur pencatatan transaksi pembelian barang dari supplier.

**Acceptance Criteria:**

1. Pengguna dapat membuat transaksi pembelian.
2. Setiap transaksi pembelian harus memilih supplier yang telah terdaftar.
3. Satu transaksi dapat berisi beberapa jenis produk.
4. Pengguna dapat memasukkan jumlah barang.
5. Pengguna dapat memasukkan harga beli.
6. Sistem menghitung subtotal dan total pembelian.
7. Sistem menyimpan tanggal pembelian dan identitas pengguna.
8. Transaksi pembelian memiliki identitas unik.

## FR-PUR-002 — Hubungan Harga Beli dengan Produk

**Requirement:**

Harga beli yang dimasukkan pada transaksi pembelian harus terhubung dengan data produk.

**Acceptance Criteria:**

1. Setiap item pembelian terhubung dengan produk atau varian terkait.
2. Harga beli disimpan sebagai bagian dari riwayat pembelian.
3. Sistem dapat memperbarui informasi harga beli produk berdasarkan transaksi terbaru sesuai aturan yang ditetapkan.
4. Harga pada transaksi lama tidak berubah.
5. Sistem mempertahankan riwayat perubahan harga beli.

**Catatan:** Mekanisme final penentuan harga beli terkini dan metode perhitungan HPP perlu diperinci sebelum implementasi.

## FR-PUR-003 — Pembelian Kredit atau Utang

**Requirement:**

Sistem harus mendukung transaksi pembelian yang tidak langsung dibayar lunas.

**Acceptance Criteria:**

1. Pengguna dapat mencatat pembelian dengan status belum dibayar.
2. Sistem menyimpan jumlah tagihan pembelian.
3. Sistem dapat mencatat jumlah yang sudah dibayar.
4. Sistem menghitung sisa utang.
5. Status pembayaran diperbarui sesuai pembayaran yang tercatat.

## FR-PUR-004 — Pembayaran Bertahap

**Requirement:**

Sistem harus mendukung pencatatan pembayaran pembelian secara bertahap.

**Acceptance Criteria:**

1. Pengguna dapat mencatat pembayaran pertama.
2. Pengguna dapat mencatat pembayaran berikutnya.
3. Setiap pembayaran menyimpan tanggal dan nominal.
4. Sistem menghitung total pembayaran.
5. Sistem menghitung sisa tagihan.
6. Status pembayaran menjadi lunas ketika seluruh tagihan telah dibayar.

## FR-PUR-005 — Pembelian dengan Banyak Produk

**Requirement:**

Satu transaksi pembelian dapat berisi beberapa jenis produk.

**Acceptance Criteria:**

1. Pengguna dapat menambahkan lebih dari satu produk ke transaksi pembelian.
2. Setiap produk memiliki jumlah dan harga beli masing-masing.
3. Sistem menghitung subtotal setiap produk.
4. Sistem menghitung total pembelian seluruh produk.

## FR-PUR-006 — Retur kepada Supplier

**Requirement:**

Sistem dapat mencatat pengembalian barang rusak kepada supplier.

**Acceptance Criteria:**

1. Pengguna dapat memilih transaksi pembelian asal apabila tersedia.
2. Pengguna dapat memilih produk yang dikembalikan.
3. Pengguna dapat memasukkan jumlah barang yang dikembalikan.
4. Sistem mencatat alasan pengembalian.
5. Sistem mencatat hasil pengembalian sesuai kesepakatan dengan supplier.
6. Perubahan stok mengikuti kondisi barang dan hasil pengembalian.

**Catatan:** Mekanisme pengembalian uang atau penggantian barang masih perlu diperinci.

# 3.5 Modul Retur Barang

## FR-RET-001 — Pencatatan Retur Pelanggan

**Requirement:**

Sistem harus menyediakan fitur pencatatan retur barang dari pelanggan.

**Acceptance Criteria:**

1. Pengguna dapat memilih transaksi penjualan asal.
2. Pengguna dapat memilih produk yang diretur.
3. Pengguna dapat memasukkan jumlah barang yang diretur.
4. Pengguna dapat mencatat tanggal retur.
5. Pengguna dapat mencatat alasan retur.
6. Sistem menyimpan identitas pengguna yang mencatat retur.
7. Sistem mendukung pencatatan retur sebagian.

## FR-RET-002 — Kondisi Barang Retur

**Requirement:**

Sistem harus membedakan kondisi barang yang dikembalikan pelanggan.

**Acceptance Criteria:**

1. Pengguna dapat menentukan kondisi barang.
2. Barang yang masih layak jual dapat diproses untuk dikembalikan ke stok.
3. Barang rusak tidak otomatis menambah stok barang layak jual.
4. Sistem menyimpan kondisi barang sebagai bagian dari riwayat retur.

## FR-RET-003 — Status Klaim Marketplace

**Requirement:**

Sistem harus menyediakan pencatatan status klaim marketplace untuk retur barang rusak.

**Acceptance Criteria:**

1. Pengguna dapat mencatat klaim belum diajukan, sedang diproses, disetujui, atau ditolak.
2. Sistem menyimpan hasil klaim.
3. Sistem membedakan klaim yang disetujui dan ditolak.
4. Status klaim dapat ditelusuri pada riwayat retur.

## FR-RET-004 — Dampak Keuangan Retur

**Requirement:**

Sistem harus mencatat dampak keuangan dari retur sesuai hasil klaim marketplace.

**Acceptance Criteria:**

1. Pengguna dapat mencatat nominal pengembalian dana kepada pelanggan.
2. Klaim yang disetujui dapat dicatat sebagai kondisi ketika penjual tidak mengalami kerugian sesuai penjelasan klien.
3. Klaim yang ditolak dapat dicatat sebagai kerugian penjual apabila dana dikembalikan kepada pelanggan dan barang diterima dalam kondisi rusak.
4. Sistem membedakan status klaim dengan status penerimaan dana.
5. Perhitungan final dampak retur terhadap omzet, HPP, dan keuntungan harus ditetapkan sebelum implementasi.

## FR-RET-005 — Penyesuaian Stok Akibat Retur

**Requirement:**

Sistem harus menyesuaikan stok berdasarkan kondisi barang yang diretur.

**Acceptance Criteria:**

1. Barang layak jual dapat menambah stok kembali.
2. Barang rusak tidak menambah stok layak jual.
3. Setiap perubahan stok akibat retur dicatat.
4. Sistem menyimpan hubungan antara retur dan transaksi asal.

# 3.6 Modul Pengeluaran

## FR-EXP-001 — Pencatatan Pengeluaran

**Requirement:**

Sistem harus menyediakan fitur pencatatan pengeluaran usaha.

**Acceptance Criteria:**

1. Pengguna dapat mencatat pengeluaran.
2. Pengguna dapat memasukkan nominal.
3. Pengguna dapat memasukkan tanggal.
4. Pengguna dapat memilih kategori pengeluaran.
5. Pengguna dapat menambahkan keterangan.
6. Sistem menyimpan identitas pengguna yang mencatat pengeluaran.

## FR-EXP-002 — Kategori Pengeluaran

**Requirement:**

Sistem harus membedakan pengeluaran teknis dan nonteknis.

**Acceptance Criteria:**

1. Pengeluaran teknis digunakan untuk biaya yang berkaitan dengan bahan kemasan.
2. Pengeluaran nonteknis digunakan untuk biaya operasional.
3. Sistem menyimpan kategori pengeluaran.
4. Pengeluaran nonteknis tidak otomatis dimasukkan ke dalam HPP bahan kemasan.

## FR-PACK-001 — Pencatatan Pembelian Bahan Kemasan

**Requirement:**

Sistem harus menyediakan pencatatan pembelian bahan kemasan sebagai persediaan tersendiri.

**Acceptance Criteria:**

1. Pengguna dapat mencatat nama bahan kemasan.
2. Pengguna dapat memasukkan jumlah pembelian.
3. Pengguna dapat menentukan satuan bahan.
4. Pengguna dapat memasukkan harga pembelian.
5. Sistem menghitung total harga pembelian.
6. Pembelian menambah stok bahan kemasan.
7. Sistem menyimpan riwayat pembelian bahan kemasan.

Contoh bahan kemasan:
- Kardus.
- Lakban atau plester.
- Bubble wrap.
- Plastik.
- Kertas struk.

## FR-PACK-002 — Pengelolaan Stok Bahan Kemasan

**Requirement:**

Sistem harus mengelola jumlah persediaan bahan kemasan.

**Acceptance Criteria:**

1. Pengguna dapat melihat stok bahan kemasan.
2. Sistem menyimpan satuan setiap bahan.
3. Sistem mencatat penambahan stok dari pembelian.
4. Sistem mencatat pengurangan stok dari pemakaian.
5. Sistem menyimpan riwayat pergerakan stok.
6. Sistem dapat menghitung sisa stok berdasarkan transaksi masuk dan pemakaian.

## FR-PACK-003 — Pemakaian Bahan Kemasan

**Requirement:**

Sistem harus mencatat pemakaian bahan kemasan pada transaksi penjualan.

**Acceptance Criteria:**

1. Pengguna dapat memilih bahan kemasan yang digunakan.
2. Pengguna dapat memasukkan jumlah bahan yang digunakan.
3. Sistem mengurangi stok bahan kemasan sesuai jumlah pemakaian.
4. Sistem menyimpan hubungan pemakaian bahan dengan transaksi penjualan.
5. Sistem menyimpan riwayat penggunaan bahan kemasan.

## FR-PACK-004 — Perhitungan Biaya Bahan Kemasan

**Requirement:**

Sistem harus menghitung biaya pemakaian bahan kemasan berdasarkan harga dan jumlah pemakaian.

**Acceptance Criteria:**

1. Sistem menghitung biaya per satuan bahan.
2. Sistem menghitung biaya berdasarkan jumlah bahan yang digunakan.
3. Sistem menjumlahkan biaya seluruh bahan kemasan pada transaksi.
4. Total biaya kemasan dimasukkan ke dalam perhitungan HPP transaksi.
5. Perubahan harga pembelian bahan tidak mengubah biaya historis transaksi yang sudah tersimpan.

**Catatan:** Metode penentuan biaya per satuan, termasuk penanganan bahan yang dibeli dalam satuan roll tetapi digunakan dalam meter, perlu ditetapkan pada desain teknis.

## FR-EXP-003 — Pengeluaran Nonteknis

**Requirement:**

Sistem harus menyediakan pencatatan pengeluaran operasional yang tidak termasuk biaya bahan kemasan.

**Acceptance Criteria:**

1. Pengguna dapat mencatat pengeluaran seperti parkir, transportasi, dan listrik.
2. Pengguna dapat menentukan kategori.
3. Sistem menyimpan nominal dan tanggal.
4. Pengeluaran dicatat sebagai biaya operasional.
5. Pengeluaran tidak dimasukkan ke dalam stok bahan kemasan.

# 3.7 Modul Dashboard

## FR-DASH-001 — Dashboard Ringkasan

**Requirement:**

Sistem harus menampilkan ringkasan kondisi usaha pada halaman dashboard.

**Acceptance Criteria:**

1. Menampilkan total penjualan berdasarkan periode.
2. Menampilkan total pembelian berdasarkan periode.
3. Menampilkan total pengeluaran.
4. Menampilkan ringkasan keuntungan berdasarkan perhitungan yang disepakati.
5. Menampilkan informasi stok produk.
6. Menampilkan informasi stok bahan kemasan.
7. Menampilkan transaksi terbaru.
8. Pengguna dapat memilih periode tampilan.

## FR-DASH-002 — Informasi Stok Rendah

**Requirement:**

Dashboard harus menampilkan informasi produk atau bahan kemasan yang mencapai batas stok minimum.

**Acceptance Criteria:**

1. Sistem menampilkan daftar stok rendah.
2. Informasi stok diperbarui berdasarkan data stok terbaru.
3. Pengguna dapat membuka detail produk atau bahan terkait.

# 3.8 Modul Riwayat Transaksi dan Pesanan

## FR-HIST-001 — Riwayat Penjualan

**Requirement:**

Sistem harus menyediakan daftar seluruh transaksi penjualan yang tersimpan.

**Acceptance Criteria:**

1. Pengguna dapat melihat daftar transaksi.
2. Pengguna dapat membuka detail transaksi.
3. Pengguna dapat mencari transaksi.
4. Pengguna dapat memfilter transaksi berdasarkan tanggal.
5. Setiap transaksi menampilkan identitas pengguna yang membuatnya.

## FR-HIST-002 — Riwayat Pembelian

**Requirement:**

Sistem harus menyediakan riwayat pembelian barang dari supplier.

**Acceptance Criteria:**

1. Pengguna dapat melihat daftar pembelian.
2. Pengguna dapat melihat detail produk pada pembelian.
3. Pengguna dapat melihat total pembelian.
4. Pengguna dapat melihat status pembayaran.
5. Pengguna dapat melihat riwayat pembayaran bertahap.

## FR-HIST-003 — Riwayat Retur

**Requirement:**

Sistem harus menyediakan riwayat retur barang.

**Acceptance Criteria:**

1. Pengguna dapat melihat daftar retur.
2. Pengguna dapat membuka detail retur.
3. Pengguna dapat melihat kondisi barang.
4. Pengguna dapat melihat status klaim marketplace.
5. Pengguna dapat melihat dampak retur terhadap stok dan keuangan sesuai data yang dicatat.

## FR-HIST-004 — Riwayat Pengeluaran dan Stok Kemasan

**Requirement:**

Sistem harus menyediakan riwayat pengeluaran dan penggunaan bahan kemasan.

**Acceptance Criteria:**

1. Pengguna dapat melihat daftar pengeluaran.
2. Pengguna dapat melihat riwayat pembelian bahan kemasan.
3. Pengguna dapat melihat riwayat penggunaan bahan kemasan.
4. Pengguna dapat menelusuri penggunaan bahan berdasarkan transaksi penjualan.

# 3.9 Modul Laporan

## FR-REPORT-001 — Laporan Penjualan

Sistem menyediakan laporan penjualan berdasarkan periode.

**Acceptance Criteria:**

1. Menampilkan total penjualan.
2. Menampilkan jumlah transaksi.
3. Menampilkan produk yang terjual.
4. Menyediakan filter periode.
5. Menampilkan data sesuai transaksi yang tersimpan.

## FR-REPORT-002 — Laporan Pembelian

Sistem menyediakan laporan pembelian barang dari supplier.

**Acceptance Criteria:**

1. Menampilkan total pembelian.
2. Menampilkan rincian pembelian.
3. Menampilkan supplier.
4. Menampilkan status pembayaran.
5. Menyediakan filter periode.

## FR-REPORT-003 — Laporan Pengeluaran

Sistem menyediakan laporan pengeluaran usaha.

**Acceptance Criteria:**

1. Menampilkan total pengeluaran.
2. Menampilkan kategori pengeluaran.
3. Memisahkan pengeluaran teknis dan nonteknis.
4. Menyediakan filter periode.

## FR-REPORT-004 — Laporan Keuntungan

Sistem menyediakan laporan keuntungan berdasarkan transaksi penjualan dan biaya terkait.

**Acceptance Criteria:**

1. Perhitungan memperhitungkan nilai penjualan.
2. Perhitungan memperhitungkan HPP barang.
3. Perhitungan memperhitungkan biaya bahan kemasan.
4. Perhitungan memperhitungkan dampak retur sesuai aturan yang disepakati.
5. Pengeluaran operasional ditampilkan secara terpisah dan diperhitungkan dalam keuntungan bersih sesuai metode yang ditetapkan.
6. Metode perhitungan final harus terdokumentasi.

## FR-REPORT-005 — Laporan Stok

Sistem menyediakan laporan jumlah stok produk.

**Acceptance Criteria:**

1. Menampilkan stok produk atau varian.
2. Menampilkan stok rendah.
3. Menampilkan riwayat pergerakan stok.
4. Menyediakan filter produk atau periode.

## FR-REPORT-006 — Laporan Bahan Kemasan

Sistem menyediakan laporan pembelian dan pemakaian bahan kemasan.

**Acceptance Criteria:**

1. Menampilkan jumlah bahan yang dibeli.
2. Menampilkan jumlah bahan yang digunakan.
3. Menampilkan sisa stok.
4. Menampilkan biaya penggunaan bahan.
5. Menyediakan filter periode.

# 3.10 Modul Pengaturan Sistem

## FR-SET-001 — Pengaturan Informasi Usaha

Sistem menyediakan pengaturan informasi usaha yang dibutuhkan untuk identitas aplikasi dan nota apabila fitur nota digunakan.

## FR-SET-002 — Pengaturan Kategori dan Satuan

Sistem menyediakan pengaturan kategori produk, kategori pengeluaran, serta satuan yang diperlukan untuk pencatatan.

## FR-SET-003 — Pengaturan Batas Stok

Sistem memungkinkan pengelola menentukan batas stok minimum produk dan bahan kemasan.

Detail pengaturan lainnya ditetapkan berdasarkan kebutuhan operasional yang telah disepakati.

# 4. Kebutuhan Nonfungsional

## NFR-001 — Keamanan

1. Sistem harus menggunakan autentikasi.
2. Password tidak disimpan dalam bentuk teks biasa.
3. Akses ke fitur harus divalidasi di sisi server.
4. Sistem harus mencegah pengguna yang belum login mengakses data operasional.

## NFR-002 — Integritas Data

1. Data transaksi harus tersimpan secara konsisten.
2. Perubahan stok harus sesuai dengan transaksi yang memengaruhinya.
3. Operasi yang saling berkaitan harus diproses secara konsisten.
4. Sistem harus mencegah pencatatan transaksi ganda akibat pengiriman permintaan yang sama.

## NFR-003 — Kemudahan Penggunaan

1. Antarmuka harus mudah dipahami.
2. Formulir input harus memiliki label yang jelas.
3. Sistem menampilkan pesan kesalahan yang dapat dipahami pengguna.
4. Proses pencatatan transaksi dibuat sesederhana mungkin.

## NFR-004 — Kinerja

1. Sistem harus mampu menangani aktivitas operasional harian.
2. Pencarian dan filter data harus memberikan hasil dalam waktu yang wajar.
3. Pengambilan laporan harus menggunakan metode yang sesuai dengan volume data.

## NFR-005 — Keterlacakan

1. Aktivitas penting harus menyimpan identitas pengguna.
2. Aktivitas penting harus menyimpan waktu kejadian.
3. Perubahan data yang memengaruhi transaksi atau stok harus dapat ditelusuri.

## NFR-006 — Kompatibilitas

Sistem harus dapat digunakan melalui browser dan perangkat yang telah ditentukan pada tahap implementasi.

## NFR-007 — Pemeliharaan

Struktur sistem harus memungkinkan pengembangan fitur dan perbaikan tanpa mengganggu keseluruhan sistem.

## NFR-008 — Keandalan Data

Data transaksi yang telah tersimpan harus tetap tersedia dan tidak berubah hanya karena data produk atau supplier diperbarui.

# 5. Aturan Bisnis

## BR-001 — Identitas Pengguna

Setiap aktivitas penting harus menyimpan identitas akun yang melakukan aktivitas tersebut.

## BR-002 — Hak Akses

Kedua akun menggunakan role `PENGELOLA` dan memiliki hak akses yang setara.

## BR-003 — Harga Historis

Perubahan harga produk tidak boleh mengubah harga yang sudah tercatat pada transaksi sebelumnya.

## BR-004 — Riwayat Produk

Produk yang memiliki riwayat transaksi tidak boleh dihapus permanen.

## BR-005 — Riwayat Supplier

Supplier yang memiliki riwayat pembelian tidak boleh dihapus permanen.

## BR-006 — Perubahan Stok

Setiap perubahan stok harus memiliki catatan pergerakan stok.

## BR-007 — Pembelian Barang

Pembelian yang dikonfirmasi menambah stok produk sesuai jumlah barang yang diterima dan aturan pencatatan yang ditetapkan.

## BR-008 — Pembayaran Pembelian

Pembayaran pembelian secara bertahap harus tercatat secara terpisah agar total pembayaran dan sisa utang dapat dihitung.

## BR-009 — Bahan Kemasan

Pembelian bahan kemasan menambah stok bahan kemasan.

Pemakaian bahan kemasan mengurangi stok dan menghasilkan biaya yang masuk ke perhitungan HPP transaksi.

## BR-010 — Pengeluaran Operasional

Pengeluaran nonteknis dicatat sebagai biaya operasional dan tidak dimasukkan ke dalam stok bahan kemasan.

## BR-011 — Retur Barang

Retur harus memiliki hubungan dengan transaksi asal apabila data transaksi asal tersedia.

## BR-012 — Kondisi Barang Retur

Barang rusak tidak otomatis dikembalikan ke stok barang layak jual.

## BR-013 — Klaim Marketplace

Status klaim marketplace harus dibedakan dari status penerimaan dana.

## BR-014 — Data Transaksi

Transaksi yang sudah tersimpan tidak boleh dihapus tanpa mekanisme koreksi atau pembatalan yang meninggalkan riwayat.

# 6. Rancangan Awal Kelompok Data

Bagian ini merupakan gambaran awal entitas database. Struktur tabel dan relasi final akan ditetapkan pada tahap ERD.

| Entitas | Fungsi |
|---|---|
| Users | Menyimpan dua akun pengelola |
| Products | Menyimpan data produk utama |
| ProductVariants | Menyimpan varian produk |
| Categories | Menyimpan kategori produk |
| Suppliers | Menyimpan data supplier |
| ProductSuppliers | Menghubungkan produk dengan supplier |
| Sales | Menyimpan transaksi penjualan |
| SaleItems | Menyimpan detail produk yang dijual |
| SalesChannels | Menyimpan kanal penjualan |
| Purchases | Menyimpan transaksi pembelian |
| PurchaseItems | Menyimpan detail pembelian |
| PurchasePayments | Menyimpan pembayaran pembelian |
| StockMovements | Menyimpan perubahan stok produk |
| Returns | Menyimpan data retur |
| ReturnItems | Menyimpan detail barang retur |
| PackagingMaterials | Menyimpan data bahan kemasan |
| PackagingPurchases | Menyimpan pembelian bahan kemasan |
| PackagingUsages | Menyimpan pemakaian bahan kemasan |
| Expenses | Menyimpan pengeluaran usaha |
| ActivityLogs | Menyimpan riwayat aktivitas pengguna |

Entitas di atas masih berupa rancangan awal. Entitas tambahan atau perubahan relasi dapat dilakukan setelah aturan bisnis dan ERD ditinjau.

# 7. Kebutuhan yang Masih Perlu Dipastikan

| No. | Bagian | Hal yang Perlu Dipastikan |
|---|---|---|
| 1 | Transaksi | Aturan diskon dan biaya tambahan |
| 2 | Transaksi | Pembatalan dan perubahan transaksi |
| 3 | Stok | Waktu pengurangan stok saat penjualan |
| 4 | Varian | Hubungan stok antarvarian dan konversi satuan |
| 5 | Pembelian | Mekanisme pembaruan harga beli produk |
| 6 | Pembelian | Penanganan barang yang belum diterima seluruhnya |
| 7 | Retur | Detail pencatatan klaim marketplace dan dana |
| 8 | Retur | Perlakuan HPP dan keuntungan untuk setiap hasil retur |
| 9 | Kemasan | Satuan pembelian dan satuan pemakaian bahan |
| 10 | HPP | Metode perhitungan biaya barang |
| 11 | Laporan | Rumus final keuntungan dan laba bersih |
| 12 | Pengaturan | Detail pengaturan yang dibutuhkan |
| 13 | Sistem | Kebutuhan penggunaan offline |
| 14 | Akun | Mekanisme pembuatan awal dan pemulihan akun |
| 15 | Nota | Kebutuhan cetak nota dan perangkat printer |
| 16 | Laporan | Kebutuhan ekspor laporan |

# 8. Kriteria Penerimaan Sistem

Sistem dapat dinyatakan memenuhi kebutuhan awal apabila:

1. Dua pengelola dapat login menggunakan akun masing-masing.
2. Kedua akun memiliki hak akses yang sama.
3. Sistem dapat mencatat transaksi penjualan.
4. Sistem dapat mengelola produk dan varian.
5. Sistem dapat mencatat perubahan stok.
6. Sistem dapat mengelola supplier.
7. Sistem dapat mencatat pembelian dan pembayaran bertahap.
8. Sistem dapat mencatat retur barang.
9. Sistem dapat mencatat pembelian dan pemakaian bahan kemasan.
10. Sistem dapat menghitung biaya kemasan ke dalam HPP.
11. Sistem dapat mencatat pengeluaran operasional.
12. Sistem dapat menampilkan dashboard dan laporan.
13. Sistem menyimpan riwayat transaksi dan aktivitas pengguna.
14. Sistem dapat menjaga konsistensi data transaksi, stok, dan perhitungan.

# 9. Batasan Implementasi

1. Sistem tidak melakukan integrasi otomatis dengan marketplace pada ruang lingkup awal.
2. Pencatatan transaksi marketplace dilakukan secara manual.
3. Sistem tidak menyediakan pengelolaan banyak cabang pada ruang lingkup awal.
4. Sistem tidak menyediakan akuntansi lengkap.
5. Detail teknis teknologi, arsitektur, dan database ditetapkan setelah kebutuhan fungsional ditinjau.
6. Fitur yang belum dikonfirmasi tidak boleh dianggap sebagai keputusan final.

# 10. Riwayat Perubahan Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 11 November 2026 | Penyusunan awal SRS berdasarkan BRD |
| 0.2 | 12 November 2026 | Pembaruan autentikasi dua akun `PENGELOLA` dengan hak akses setara, pencatatan aktivitas, serta penyesuaian kebutuhan Modul 2–5 |

---

**Akhir Dokumen SRS WarungAdam v0.2**