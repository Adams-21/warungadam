# BUSINESS REQUIREMENTS DOCUMENT (BRD)

**Nama Proyek:** WarungAdam — Sistem Kasir dan Manajemen Usaha  
**Versi:** 0.3 — Draft Baseline  
**Tanggal:** 12 November 2026  
**Status:** Draft untuk Pengembangan dan Validasi Kebutuhan  
**Metodologi:** Agentic Engineering / The New SDLC

---

# 1. Ringkasan Proyek

WarungAdam merupakan sistem kasir dan manajemen usaha berbasis web yang dirancang untuk membantu pengelola usaha dalam menjalankan kegiatan operasional dan memantau kondisi usaha.

Sistem mencakup pencatatan transaksi penjualan, pengelolaan produk dan stok, pencatatan pembelian dari supplier, pengelolaan retur barang, pencatatan pengeluaran, penghitungan harga pokok penjualan (HPP), serta penyediaan laporan usaha.

Sistem digunakan oleh dua orang pengelola usaha yang menjalankan kegiatan operasional secara bersama-sama. Keduanya memiliki akun masing-masing dengan hak akses yang setara.

Pencatatan transaksi dilakukan melalui sistem. Untuk penjualan dari marketplace, data transaksi dimasukkan secara manual oleh pengelola dan tidak bergantung pada integrasi API marketplace.

Dokumen ini menjadi dasar untuk menentukan kebutuhan bisnis sebelum diterjemahkan menjadi kebutuhan teknis dalam Software Requirements Specification (SRS).

# 2. Latar Belakang

Kegiatan operasional usaha melibatkan berbagai aktivitas, seperti penjualan, pembelian barang dari supplier, pengelolaan stok, penggunaan bahan kemasan, pencatatan pengeluaran, serta pemantauan keuntungan.

Jika aktivitas tersebut dicatat secara terpisah atau manual, pengelola dapat mengalami kesulitan dalam mengetahui kondisi stok, modal barang, biaya kemasan, keuntungan, dan arus kas usaha.

WarungAdam dikembangkan untuk menyatukan pencatatan tersebut dalam satu sistem agar data operasional lebih terstruktur, mudah dipantau, dan memiliki riwayat yang jelas.

# 3. Tujuan Sistem

1. Mempermudah pencatatan transaksi penjualan.
2. Membantu pengelola mengelola produk dan stok barang.
3. Mempermudah pencatatan pembelian barang dari supplier.
4. Mencatat dan mengelola proses retur barang.
5. Mencatat pengeluaran usaha berdasarkan jenisnya.
6. Menghitung HPP barang dan biaya kemasan yang digunakan.
7. Membantu pengelola mengetahui keuntungan usaha.
8. Menyediakan laporan berdasarkan periode tertentu.
9. Menyimpan riwayat transaksi dan perubahan data.
10. Memungkinkan dua pengelola menggunakan sistem dengan hak akses setara.

# 4. Pengguna Sistem

Sistem digunakan oleh dua orang pengelola usaha, yaitu pemilik usaha dan suaminya.

Keduanya menjalankan kegiatan usaha secara bersama-sama dan membutuhkan akses terhadap fitur operasional yang sama.

Ketentuan pengguna:

1. Sistem menyediakan dua akun pengguna terpisah.
2. Kedua akun menggunakan peran yang sama, yaitu `PENGELOLA`.
3. Kedua pengguna memiliki hak akses yang setara.
4. Tidak ada pembagian jabatan Owner dan Kasir di dalam sistem.
5. Kedua pengguna dapat melakukan aktivitas operasional.
6. Sistem mencatat identitas pengguna yang melakukan aktivitas penting.
7. Kedua pengguna dapat melihat data usaha yang sama.

# 5. Ruang Lingkup Sistem

## 5.1 Fitur yang Termasuk dalam Sistem

### A. Kasir dan Transaksi

- Pencatatan transaksi penjualan.
- Pemilihan produk dan jumlah barang.
- Perhitungan subtotal dan total transaksi.
- Pencatatan transaksi penjualan offline.
- Pencatatan transaksi dari marketplace secara manual.
- Pemilihan kanal penjualan.
- Pencatatan nomor transaksi atau nomor resi.
- Perhitungan biaya kemasan berdasarkan bahan yang digunakan.
- Penyimpanan riwayat transaksi.
- Pencetakan nota apabila diperlukan.

### B. Produk dan Stok

- Penambahan dan pengelolaan data produk.
- Pengelolaan varian atau jenis kemasan produk.
- Input barcode melalui pemindaian atau pengetikan manual.
- Pengelolaan stok produk.
- Pencatatan perubahan harga beli.
- Penghubungan produk dengan lebih dari satu supplier.
- Peringatan stok rendah.
- Pencatatan penyesuaian stok.
- Penonaktifan produk tanpa menghilangkan riwayat transaksi.

### C. Supplier dan Pembelian

- Pencatatan data supplier.
- Pengelolaan informasi supplier.
- Pencatatan transaksi pembelian barang.
- Pemilihan supplier terdaftar pada transaksi pembelian.
- Pembelian dengan beberapa jenis barang dalam satu transaksi.
- Pencatatan harga beli barang.
- Pembelian secara tunai maupun utang.
- Pencatatan pembayaran secara bertahap.
- Riwayat pembelian.
- Pencatatan pengembalian barang kepada supplier jika diperlukan.

### D. Retur Barang

- Pencatatan retur barang dari pelanggan.
- Pencatatan produk dan jumlah barang yang diretur.
- Pencatatan kondisi barang setelah dikembalikan.
- Pencatatan status klaim marketplace.
- Pencatatan pengembalian dana.
- Pencatatan kerugian akibat retur barang rusak.
- Penyesuaian stok berdasarkan kondisi barang.
- Pemisahan antara retur pelanggan dan retur kepada supplier.

### E. Pengeluaran

- Pencatatan pengeluaran usaha.
- Pemisahan pengeluaran teknis dan nonteknis.
- Pencatatan pembelian bahan kemasan.
- Pengelolaan stok bahan kemasan.
- Pencatatan pemakaian bahan kemasan saat transaksi.
- Penghitungan biaya kemasan berdasarkan pemakaian.
- Pengurangan stok bahan kemasan secara otomatis.
- Pencatatan pengeluaran operasional seperti parkir, transportasi, dan listrik.

### F. Dashboard

- Ringkasan penjualan.
- Ringkasan pengeluaran.
- Ringkasan keuntungan.
- Informasi stok produk.
- Informasi stok bahan kemasan.
- Ringkasan aktivitas usaha.
- Filter data berdasarkan periode.

### G. Riwayat Transaksi dan Pesanan

- Menampilkan riwayat transaksi penjualan.
- Menampilkan riwayat pembelian.
- Menampilkan riwayat retur.
- Menampilkan riwayat pengeluaran.
- Pencarian dan filter data.
- Melihat detail transaksi.
- Menampilkan status transaksi.

### H. Laporan

- Laporan penjualan.
- Laporan pembelian.
- Laporan pengeluaran.
- Laporan keuntungan.
- Laporan stok produk.
- Laporan penggunaan bahan kemasan.
- Laporan retur barang.
- Filter laporan berdasarkan periode.

### I. Pengaturan Sistem

- Pengaturan informasi usaha.
- Pengaturan data pendukung sistem.
- Pengaturan kategori atau satuan yang dibutuhkan.
- Pengaturan batas stok minimum.
- Pengaturan preferensi sistem yang disepakati.

### J. Hak Akses Pengguna

- Login dan logout.
- Dua akun pengguna dengan peran `PENGELOLA`.
- Hak akses setara untuk kedua pengguna.
- Pencatatan identitas pengguna pada aktivitas penting.
- Pengelolaan akun sesuai kebutuhan sistem.

## 5.2 Fitur di Luar Ruang Lingkup Sementara

Fitur berikut tidak termasuk dalam ruang lingkup awal kecuali disepakati kemudian:

1. Integrasi API otomatis dengan marketplace.
2. Sinkronisasi pesanan marketplace secara otomatis.
3. Sinkronisasi stok marketplace secara otomatis.
4. Sistem pembayaran pelanggan atau payment gateway.
5. Aplikasi khusus pelanggan.
6. Pengelolaan banyak cabang usaha.
7. Sistem akuntansi lengkap seperti neraca dan laporan pajak.
8. Penggajian karyawan.
9. Integrasi otomatis dengan layanan pengiriman.
10. Fitur lain yang belum menjadi kebutuhan usaha.

# 6. Kebutuhan Bisnis Berdasarkan Modul

## 6.1 Modul Kasir dan Transaksi

Sistem harus membantu pengelola mencatat transaksi penjualan secara terstruktur.

Transaksi dibedakan menjadi:

- Penjualan offline, yaitu transaksi yang dicatat langsung melalui fitur kasir.
- Penjualan online, yaitu transaksi yang berasal dari marketplace dan dimasukkan secara manual ke sistem.

Untuk transaksi online, pengelola dapat memilih kanal penjualan dan memasukkan nomor transaksi atau nomor resi.

Sistem juga perlu mendukung pencatatan bahan kemasan yang digunakan pada transaksi agar biaya kemasan dapat dihitung ke dalam HPP.

**Hal yang masih perlu dikonfirmasi:**
- Aturan pembatalan dan pengubahan transaksi.
- Status pembayaran dan pencairan dana marketplace.
- Aturan diskon dan biaya tambahan.
- Kebutuhan pencetakan nota.
- Waktu pengurangan stok produk.

## 6.2 Modul Produk dan Stok

Sistem harus mendukung pengelolaan produk beserta varian atau bentuk kemasannya.

Kebutuhan yang telah dikonfirmasi klien:

1. Satu produk dapat memiliki beberapa varian atau bentuk kemasan, misalnya minyak dalam kemasan 800 ml, 1 liter, 2 liter, dan botol.
2. Input produk mendukung pemindaian barcode dan input manual.
3. Satu produk dapat memiliki lebih dari satu supplier.
4. Alamat supplier boleh disimpan, tetapi tidak wajib.
5. Perubahan harga beli perlu dicatat.
6. Sistem perlu memberikan notifikasi stok rendah dan menyediakan pengurutan atau penyaringan produk berdasarkan kondisi stok.
7. Produk yang sudah memiliki riwayat penjualan tidak dihapus permanen, tetapi dapat dinonaktifkan.
8. Penyesuaian stok manual menyediakan kolom alasan yang bersifat opsional.

Detail teknis pengelolaan konversi satuan dan hubungan stok antarvarian ditentukan pada tahap SRS dan desain database.

## 6.3 Modul Supplier dan Pembelian Barang

Sistem harus membantu pengelola mencatat pembelian barang dari supplier.

Kebutuhan yang telah dikonfirmasi klien:

1. Pembelian barang dapat dicatat sebagai transaksi pembelian.
2. Harga beli pada transaksi perlu terhubung dengan data harga pada produk.
3. Setiap transaksi pembelian memilih supplier yang telah terdaftar.
4. Satu transaksi pembelian dapat berisi beberapa jenis barang.
5. Pembelian dapat dilakukan secara utang atau dibayar belakangan.
6. Pembayaran bertahap perlu dicatat.
7. Pengembalian barang rusak kepada supplier dapat dicatat.

Pencatatan harga beli harus tetap menyimpan riwayat harga sebelumnya agar perubahan harga tidak mengubah data transaksi lama.

Detail hubungan antara harga beli, harga produk, dan perhitungan HPP akan ditentukan pada tahap SRS.

## 6.4 Modul Retur Barang

Sistem perlu mendukung pencatatan retur barang dari pelanggan, khususnya transaksi yang berasal dari marketplace.

Berdasarkan penjelasan klien, terdapat dua kemungkinan hasil klaim barang rusak:

**A. Klaim marketplace diterima**

- Barang rusak dikembalikan oleh pelanggan.
- Klaim kepada marketplace disetujui.
- Penjual tidak mengalami kerugian sesuai penjelasan klien.
- Dana penjualan tetap menjadi hak penjual.

**B. Klaim marketplace ditolak**

- Pelanggan menerima pengembalian dana.
- Dana penjualan tidak diterima penjual.
- Barang yang dikembalikan berada dalam kondisi rusak.
- Penjual mengalami kerugian karena tidak memperoleh pendapatan dari transaksi tersebut.

Sistem perlu membedakan status klaim marketplace dengan status penerimaan dana.

Sistem juga perlu mengantisipasi retur sebagian, yaitu ketika pelanggan hanya mengembalikan sebagian jumlah barang dalam satu transaksi.

Detail mekanisme pembukuan dan perlakuan stok untuk setiap kondisi akan ditentukan pada tahap SRS.

## 6.5 Modul Pengeluaran

Pengeluaran dibagi menjadi dua kelompok:

**A. Pengeluaran Teknis**

Pengeluaran yang berkaitan langsung dengan proses pengemasan dan penjualan, misalnya:

- Kertas struk.
- Lakban atau plester.
- Kardus.
- Bubble wrap.
- Plastik.

Klien menginginkan pencatatan pembelian bahan kemasan berdasarkan jumlah, satuan, dan harga pembelian.

Ketika transaksi penjualan dilakukan, pengelola dapat memilih bahan kemasan yang digunakan beserta jumlah pemakaiannya.

Sistem kemudian menghitung biaya pemakaian bahan kemasan dan memasukkannya ke dalam perhitungan HPP transaksi.

Stok bahan kemasan juga harus berkurang sesuai jumlah pemakaian.

**B. Pengeluaran Nonteknis**

Pengeluaran operasional yang tidak secara langsung menjadi bahan kemasan produk, misalnya:

- Parkir.
- Transportasi.
- Listrik.
- Pengeluaran operasional lainnya.

Pengeluaran nonteknis dicatat sebagai biaya operasional dan tidak dimasukkan ke dalam HPP bahan kemasan.

## 6.6 Modul Dashboard

Dashboard menjadi halaman utama untuk memantau kondisi usaha.

Informasi yang direncanakan:

- Total penjualan.
- Total pembelian.
- Total pengeluaran.
- Estimasi keuntungan.
- Informasi stok produk.
- Informasi stok bahan kemasan.
- Ringkasan aktivitas usaha.

Rumus dan tampilan angka akan disesuaikan dengan metode perhitungan yang ditetapkan dalam SRS.

## 6.7 Modul Riwayat Transaksi dan Pesanan

Sistem menyediakan riwayat aktivitas usaha yang meliputi:

- Penjualan.
- Pembelian.
- Retur.
- Pengeluaran.
- Perubahan stok.

Pengelola dapat mencari dan memfilter data berdasarkan periode atau informasi transaksi yang tersedia.

Data lama harus tetap dapat ditelusuri meskipun produk atau supplier sudah dinonaktifkan.

## 6.8 Modul Laporan

Sistem menyediakan laporan untuk membantu pengelola mengevaluasi kegiatan usaha.

Jenis laporan yang direncanakan:

1. Laporan penjualan.
2. Laporan pembelian.
3. Laporan pengeluaran.
4. Laporan keuntungan.
5. Laporan stok.
6. Laporan penggunaan bahan kemasan.
7. Laporan retur.

Laporan dapat ditampilkan berdasarkan periode tertentu.

Metode perhitungan keuntungan harus memperhitungkan HPP barang, biaya kemasan, retur, dan pengeluaran operasional sesuai aturan yang ditetapkan.

## 6.9 Modul Pengaturan Sistem

Sistem menyediakan pengaturan untuk mendukung operasional usaha, seperti informasi usaha, kategori, satuan, dan batas stok minimum.

Detail pengaturan yang dibutuhkan akan disesuaikan dengan kebutuhan pengguna.

## 6.10 Modul Hak Akses Pengguna

Sistem digunakan oleh dua pengelola dengan hak akses setara.

Ketentuan:

1. Tersedia dua akun terpisah.
2. Keduanya memiliki role `PENGELOLA`.
3. Keduanya dapat mengakses seluruh fitur operasional.
4. Tidak ada hierarki Owner dan Kasir.
5. Setiap aktivitas penting mencatat identitas pengguna.
6. Kedua pengguna menggunakan data usaha yang sama.

# 7. Kebutuhan Nonfungsional

1. **Kemudahan penggunaan:** Antarmuka mudah dipahami oleh pengelola usaha.
2. **Keamanan:** Sistem menyediakan autentikasi pengguna dan perlindungan akses.
3. **Integritas data:** Pencatatan transaksi dan perubahan stok harus konsisten.
4. **Keandalan:** Data transaksi yang sudah tersimpan tidak boleh hilang akibat perubahan data produk.
5. **Keterlacakan:** Aktivitas penting dapat diketahui berdasarkan pengguna dan waktu.
6. **Kinerja:** Sistem dapat digunakan untuk aktivitas operasional sehari-hari tanpa waktu tunggu yang mengganggu.
7. **Kompatibilitas:** Sistem dapat digunakan melalui browser pada perangkat yang disepakati.
8. **Pemeliharaan:** Sistem dirancang agar dapat dikembangkan dan diperbaiki tanpa mengubah seluruh struktur aplikasi.

# 8. Aturan Bisnis Umum

1. Setiap transaksi penjualan memiliki identitas transaksi yang unik.
2. Setiap pembelian memiliki identitas transaksi yang unik.
3. Harga produk pada transaksi lama tidak berubah ketika harga produk diperbarui.
4. Produk yang memiliki riwayat transaksi tidak boleh dihapus permanen.
5. Supplier yang memiliki riwayat pembelian tidak boleh dihapus permanen.
6. Perubahan stok harus memiliki riwayat.
7. Pembelian barang menambah stok produk setelah transaksi pembelian dikonfirmasi sesuai aturan sistem.
8. Pemakaian bahan kemasan mengurangi stok bahan kemasan.
9. Biaya bahan kemasan dihitung berdasarkan jumlah pemakaian.
10. Pengeluaran operasional dicatat terpisah dari biaya bahan kemasan.
11. Retur barang harus dikaitkan dengan transaksi asal jika transaksi asal tersedia.
12. Retur barang rusak tidak boleh otomatis menambah stok barang layak jual.
13. Status klaim marketplace dan status penerimaan dana harus dibedakan.
14. Setiap aktivitas penting mencatat identitas pengguna.
15. Kedua akun pengelola memiliki hak akses yang setara.

# 9. Batasan dan Asumsi

1. Sistem digunakan untuk satu usaha.
2. Sistem memiliki dua akun pengelola pada kebutuhan awal.
3. Penjualan marketplace dicatat secara manual.
4. Sistem tidak melakukan sinkronisasi otomatis dengan marketplace.
5. Data yang dimasukkan pengguna menjadi dasar perhitungan laporan.
6. Koneksi internet dan kebutuhan penggunaan offline masih perlu dipastikan.
7. Detail metode perhitungan HPP dan stok akan dijelaskan lebih lanjut dalam SRS.
8. Fitur di luar ruang lingkup dapat ditambahkan melalui kesepakatan baru.

# 10. Hal yang Masih Perlu Dikonfirmasi

| No. | Kebutuhan | Status |
|---|---|---|
| 1 | Aturan diskon dan biaya tambahan transaksi | Perlu Konfirmasi |
| 2 | Aturan pembatalan dan pengubahan transaksi | Perlu Konfirmasi |
| 3 | Waktu pengurangan stok produk | Perlu Konfirmasi |
| 4 | Konversi satuan antarvarian produk | Perlu Konfirmasi Teknis |
| 5 | Detail hubungan harga beli dengan harga produk | Perlu Perincian |
| 6 | Mekanisme retur dan pembukuan klaim marketplace | Perlu Perincian |
| 7 | Detail satuan dan pemakaian bahan kemasan | Perlu Perincian |
| 8 | Rumus final perhitungan HPP dan keuntungan | Perlu Perincian |
| 9 | Kebutuhan cetak nota | Perlu Konfirmasi |
| 10 | Kebutuhan ekspor laporan | Perlu Konfirmasi |
| 11 | Kebutuhan penggunaan offline | Perlu Konfirmasi |
| 12 | Mekanisme pembuatan dan pengelolaan dua akun awal | Perlu Perincian Teknis |

# 11. Kriteria Keberhasilan Sistem

Sistem dianggap memenuhi tujuan bisnis apabila:

1. Kedua pengelola dapat menggunakan sistem dengan akun masing-masing.
2. Transaksi penjualan dapat dicatat dan ditelusuri.
3. Produk dan stok dapat dikelola.
4. Pembelian barang dari supplier dapat dicatat.
5. Pembayaran pembelian secara bertahap dapat direkam.
6. Retur barang dapat dicatat sesuai kondisinya.
7. Pembelian dan pemakaian bahan kemasan dapat dikelola.
8. Biaya kemasan dapat dihitung ke dalam HPP.
9. Pengeluaran operasional dapat dicatat secara terpisah.
10. Dashboard dan laporan menampilkan data yang berasal dari transaksi tersimpan.
11. Aktivitas penting dapat ditelusuri berdasarkan pengguna.

# 12. Riwayat Perubahan Dokumen

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1 | 11 November 2026 | Penyusunan awal BRD berdasarkan kebutuhan usaha |
| 0.2 | 11 November 2026 | Penambahan ruang lingkup sepuluh modul |
| 0.3 | 12 November 2026 | Pembaruan kebutuhan dua pengelola dengan hak akses setara dan penyesuaian jawaban klien |

---

**Akhir Dokumen BRD WarungAdam v0.3**