# SRS BizManage v0.4

SRS v0.4 mengacu pada BRD v0.5. Requirement yang bergantung pada TBD memakai asumsi sementara dari BRD bagian 8 dan ditandai Blocked pada kolom TBD sampai klien mengonfirmasi.

## 1. Pendahuluan

| Informasi | Keterangan |
| --- | --- |
| Nama sistem | BizManage, Sistem Kasir dan Manajemen Usaha |
| Versi dokumen | 0.4, Draft Revision |
| Dokumen acuan | BRD v0.5 |
| Status | Draft, menunggu review dan konfirmasi klien |

SRS ini menjadi dasar perancangan database, antarmuka, implementasi, dan pengujian. Sebelas modul sama dengan BRD v0.5: autentikasi dan pengguna, kasir dan transaksi, produk dan stok, supplier dan pembelian, retur, pengeluaran operasional, persediaan bahan kemasan, dashboard, riwayat, laporan, dan pengaturan.

### Cara membaca tabel requirement

Kolom **BR** menunjuk kebutuhan bisnis di BRD. Kolom **TBD** menunjuk keputusan klien yang belum final; requirement dengan TBD memakai asumsi sementara dari BRD bagian 8 dan kriteria pengujiannya berstatus *Blocked* sampai TBD dikonfirmasi.

### Istilah

| Istilah | Pengertian |
| --- | --- |
| HPP | Harga Pokok Penjualan: biaya yang melekat pada barang dan kemasan yang terjual |
| Varian | Bentuk atau ukuran suatu produk yang punya barcode, harga, dan stok sendiri |
| Snapshot HPP | Harga jual dan HPP yang disimpan pada saat transaksi terjadi |
| Penerimaan barang | Pencatatan barang yang benar-benar diterima dari supplier |
| Stok rusak | Stok barang tidak layak jual yang tidak ikut dijual |
| Void | Pembatalan transaksi atau pembayaran dengan menyimpan catatan awal |
| PENGELOLA | Peran pengguna dengan hak akses operasional setara |

## 2. Deskripsi Umum

Sistem adalah aplikasi web untuk satu usaha. Penjualan marketplace dicatat manual; tidak ada integrasi API.

| Pengguna | Role | Hak akses |
| --- | --- | --- |
| Pengelola 1 | `PENGELOLA` | Semua fitur operasional |
| Pengelola 2 | `PENGELOLA` | Semua fitur operasional, setara dengan Pengelola 1 |

### Asumsi teknis

1. Basis data relasional dengan transaksi atomik untuk operasi yang saling terkait.
2. Nilai uang disimpan dalam Rupiah bilangan bulat.
3. Kuantitas dan biaya per satuan memakai desimal 4 digit; biaya yang disimpan ke transaksi dibulatkan ke Rupiah terdekat per baris (TBD-16).
4. Setiap transaksi punya nomor unik dan setiap aktivitas penting menyimpan pengguna dan waktu.
5. Data historis tidak berubah ketika harga atau data master diperbarui.
6. Teknologi implementasi ditentukan pada tahap arsitektur.

## 3. Kebutuhan Fungsional

### 3.1 Modul Autentikasi dan Pengguna

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-AUTH-001 | Sistem menyediakan login dengan identitas akun dan password. | Kredensial benar masuk ke dashboard; kredensial salah ditolak dengan pesan tanpa menyebut bagian mana yang salah; halaman internal tidak dapat dibuka tanpa login. | BR-013 |  |
| FR-AUTH-002 | Sistem mendukung dua akun awal dengan role `PENGELOLA` dan hak akses setara. | Kedua akun dapat login terpisah; kedua akun dapat membuka dan mengubah semua modul operasional; hak akses tidak dibedakan berdasarkan urutan pembuatan akun. | BR-013 |  |
| FR-AUTH-003 | Pengguna dapat mengganti password sendiri; pengelola lain dapat mereset password akun rekannya. | Ganti password meminta password lama; reset menghasilkan password sementara yang wajib diganti saat login berikutnya; password baru disimpan sebagai hash; kejadian tercatat di riwayat aktivitas. | BR-013 | TBD-19 |
| FR-AUTH-004 | Sistem dapat menonaktifkan dan mengaktifkan kembali akun. | Akun nonaktif tidak dapat login; riwayat transaksi tetap menyimpan nama pelaku; sistem menolak menonaktifkan akun terakhir yang aktif. | BR-013, BR-015 | TBD-19 |
| FR-AUTH-005 | Sistem menyediakan logout dan mengakhiri sesi yang tidak aktif. | Setelah logout, tombol kembali tidak menampilkan data internal; sesi berakhir setelah 30 menit tanpa aktivitas (angka dapat diubah). | BR-013 |  |
| FR-AUTH-006 | Sistem menyimpan pengguna dan waktu pada aktivitas penting. | Penjualan, pembelian, pembayaran, retur, pengeluaran, penyesuaian stok, pembatalan, dan perubahan akun menyimpan ID pengguna dan waktu; data pelaku tetap ada setelah akun dinonaktifkan. | BR-014 |  |
| FR-AUTH-007 | Otorisasi diperiksa di sisi server pada setiap permintaan. | Permintaan tanpa sesi sah ditolak walaupun diketik langsung ke alamat internal; akses data tanpa login mengembalikan respons tidak berwenang. | BR-013 |  |

### 3.2 Modul Kasir dan Transaksi

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-SALE-001 | Sistem mencatat penjualan offline. | Transaksi menyimpan nomor unik, tanggal dan waktu, pengguna, daftar varian, jumlah, harga jual, diskon, total, metode pembayaran, dan status; transaksi tersimpan muncul di riwayat penjualan. | BR-001, BR-002 | TBD-14 |
| FR-SALE-002 | Sistem mencari produk lewat pencarian teks dan barcode di kasir. | Pencarian nama atau kode menampilkan varian yang cocok; scan barcode menambahkan varian ke transaksi; barcode tidak terdaftar menampilkan "produk tidak ditemukan"; varian nonaktif tidak dapat dipilih. | BR-005 | TBD-24 |
| FR-SALE-003 | Sistem mencatat kanal penjualan pada setiap transaksi. | Kanal dipilih dari daftar di pengaturan (offline dan marketplace); kanal tersimpan di transaksi dan dapat dipakai sebagai filter. | BR-001 | TBD-20 |
| FR-SALE-004 | Sistem mencatat penjualan marketplace secara manual. | Pengguna mengisi kanal, nomor transaksi atau resi, tanggal, item, jumlah, harga jual, dan biaya terkait; sistem tidak mengambil data otomatis; nomor resi yang sama pada kanal yang sama diberi peringatan duplikat. | BR-001 |  |
| FR-SALE-005 | Sistem menghitung total transaksi. | Subtotal item = harga jual × jumlah; total = jumlah subtotal − diskon + biaya tambahan dari pelanggan; hasil sesuai hitungan manual pada contoh uji. | BR-002 | TBD-13 |
| FR-SALE-006 | Sistem mendukung diskon per item dan per transaksi serta biaya tambahan dari pelanggan. | Diskon berupa nominal; diskon tidak membuat total negatif; biaya tambahan tersimpan terpisah dari subtotal. | BR-002 | TBD-13 |
| FR-SALE-007 | Sistem mencatat biaya marketplace per pesanan marketplace. | Pengguna dapat mengisi komisi, biaya layanan, dan ongkir ditanggung penjual; biaya tersimpan terpisah dari HPP dan muncul di laporan keuntungan. | BR-019 | TBD-04 |
| FR-SALE-008 | Sistem menyimpan tiga kelompok status: pesanan, pembayaran, dan pencairan dana. | Status pesanan: diproses, selesai, dibatalkan. Status pembayaran: belum dibayar, dibayar, dikembalikan. Status pencairan (marketplace): belum cair, sebagian cair, sudah cair, tidak dicairkan. Setiap perubahan menyimpan waktu dan pengguna. | BR-002 | TBD-14 |
| FR-SALE-009 | Sistem mencatat jumlah dan tanggal dana marketplace yang cair. | Pencairan dapat dicatat bertahap; total cair tidak melebihi nilai yang berhak diterima kecuali ada catatan; status pencairan mengikuti total cair. | BR-019, BR-020 | TBD-14 |
| FR-SALE-010 | Sistem membatalkan transaksi tanpa menghapusnya. | Pembatalan wajib alasan; transaksi tetap terlihat berstatus dibatalkan; stok produk kembali; pemakaian kemasan tidak dikembalikan kecuali pengguna memilih; pelaku dan waktu tercatat. | BR-002, BR-015 | TBD-11 |
| FR-SALE-011 | Sistem mengurangi stok produk saat penjualan. | Offline: stok berkurang saat transaksi disimpan. Marketplace: stok berkurang saat pesanan dicatat. Penjualan ditolak jika stok varian tidak mencukupi. | BR-016 | TBD-09, TBD-10 |
| FR-SALE-012 | Sistem menyimpan snapshot harga jual dan HPP setiap item. | Perubahan harga atau harga beli setelah transaksi tidak mengubah nilai transaksi lama; laporan periode lama menghasilkan angka yang sama sebelum dan sesudah perubahan harga. | BR-003 | TBD-03 |
| FR-SALE-013 | Sistem mendukung harga jual per kanal. | Varian punya harga default dan dapat punya harga khusus per kanal; harga terisi otomatis sesuai kanal dan dapat diubah pada transaksi. | BR-001 | TBD-05 |
| FR-SALE-014 | Sistem mencatat pemakaian bahan kemasan pada transaksi. | Pengguna memilih bahan dan jumlah pakai; biaya per baris dihitung dan masuk HPP transaksi; stok kemasan berkurang; rincian terlihat di detail transaksi (lihat FR-PACK-003). | BR-011 | TBD-16 |
| FR-SALE-015 | Sistem dapat mencetak nota transaksi. | Nota menampilkan identitas usaha, nomor, tanggal, item, dan total; pencetakan lewat fitur cetak browser. | BR-002 | TBD-24 |

### 3.3 Modul Produk dan Stok

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-PROD-001 | Sistem mengelola produk: tambah, ubah, lihat, cari, dan nonaktifkan. | Produk baru muncul di daftar dan pencarian; perubahan tersimpan; produk nonaktif tidak muncul di kasir tetapi tetap muncul di riwayat. | BR-004 |  |
| FR-PROD-002 | Sistem mengelompokkan produk dalam kategori. | Pengguna dapat memilih kategori saat membuat produk dan memfilter daftar berdasarkan kategori. | BR-004 | TBD-21 |
| FR-PROD-003 | Satu produk dapat memiliki beberapa varian. | Setiap varian punya nama, satuan, barcode, harga jual, harga beli terakhir, HPP, dan stok sendiri; transaksi menyimpan varian yang dijual. | BR-004 | TBD-01, TBD-02 |
| FR-PROD-004 | Sistem menerima barcode lewat pemindaian atau ketik manual. | Barcode tersimpan pada varian; barcode yang sudah dipakai varian lain ditolak dengan pesan menyebut varian tersebut; satu varian boleh tanpa barcode. | BR-005 | TBD-24 |
| FR-PROD-005 | Sistem mencatat riwayat harga beli per varian. | Setiap penerimaan atau pembelian baru menambah satu baris riwayat berisi tanggal, supplier, dan harga; baris lama tidak berubah. | BR-003, BR-007 |  |
| FR-PROD-006 | Sistem menghitung HPP varian dengan rata-rata tertimbang bergerak. | Setelah penerimaan: HPP baru = (stok lama × HPP lama + qty masuk × harga beli) ÷ (stok lama + qty masuk); contoh uji menghasilkan angka yang sama dengan hitungan manual. | BR-011 | TBD-03 |
| FR-PROD-007 | Satu varian dapat dihubungkan dengan lebih dari satu supplier. | Varian dapat memiliki beberapa supplier; satu supplier dapat menyediakan banyak varian; harga beli terakhir per supplier terlihat. | BR-006 | TBD-25 |
| FR-PROD-008 | Sistem menampilkan stok dan mencatat setiap perubahannya. | Setiap perubahan stok membuat satu catatan berisi varian, jumlah, jenis (penerimaan, penjualan, retur, penyesuaian, pembatalan), referensi dokumen, pengguna, dan waktu; saldo stok sama dengan jumlah catatan. | BR-016 |  |
| FR-PROD-009 | Sistem menyediakan penyesuaian stok manual. | Pengguna mengisi jumlah baru atau selisih; alasan opsional; stok tidak dapat menjadi negatif; pelaku dan waktu tercatat. | BR-016 | TBD-09 |
| FR-PROD-010 | Sistem memberi peringatan stok rendah. | Varian dengan stok di bawah atau sama dengan batas minimum diberi penanda; daftar produk dapat diurutkan dan disaring menurut kondisi stok; batas kosong berarti tanpa peringatan. | BR-016 | TBD-22 |
| FR-PROD-011 | Sistem melindungi produk yang punya riwayat dari penghapusan permanen. | Produk atau varian yang sudah dipakai transaksi hanya dapat dinonaktifkan; upaya hapus ditolak dengan pesan; produk tanpa riwayat boleh dihapus. | BR-015 |  |

### 3.4 Modul Supplier dan Pembelian Barang

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-SUP-001 | Sistem mengelola supplier: tambah, ubah, lihat, cari, dan nonaktifkan. | Data supplier berisi nama, telepon, alamat (opsional), dan catatan; supplier yang punya riwayat pembelian hanya dapat dinonaktifkan; supplier nonaktif tidak muncul di pembelian baru tetapi tetap muncul di riwayat. | BR-006, BR-015 |  |
| FR-PUR-001 | Sistem mencatat pembelian dari supplier terdaftar dengan banyak barang. | Pembelian menyimpan nomor unik, supplier, tanggal, daftar varian, jumlah, harga beli, subtotal, total, catatan, dan pengguna; satu pembelian dapat berisi lebih dari satu varian. | BR-007 |  |
| FR-PUR-002 | Sistem menyimpan status pembelian. | Status: draf, dikonfirmasi, diterima sebagian, diterima seluruhnya, dibatalkan. Draf menjadi dikonfirmasi; dikonfirmasi menjadi diterima sebagian atau seluruhnya sesuai penerimaan; pembatalan hanya sebelum ada penerimaan; perubahan status tercatat. | BR-007 | TBD-08 |
| FR-PUR-003 | Sistem mencatat penerimaan barang. | Penerimaan memilih pembelian, varian, dan jumlah diterima; jumlah tidak melebihi sisa pesanan; stok dan HPP bertambah hanya sebesar jumlah diterima; penerimaan sebagian dapat dilanjutkan di kemudian hari. | BR-007 | TBD-08 |
| FR-PUR-004 | Sistem mendukung pembelian tunai dan tempo. | Pembelian tunai langsung lunas; pembelian tempo menyimpan total tagihan, total dibayar, sisa tagihan, dan status pembayaran (belum dibayar, sebagian, lunas). | BR-008 |  |
| FR-PUR-005 | Sistem menyimpan tanggal jatuh tempo pembelian tempo. | Tanggal jatuh tempo opsional; tagihan dengan sisa lebih dari nol dan lewat jatuh tempo ditandai terlambat dan tampil di dashboard. | BR-020 | TBD-17 |
| FR-PUR-006 | Sistem mencatat pembayaran bertahap kepada supplier. | Setiap pembayaran menyimpan tanggal, nominal, metode, dan pengguna; total bayar dan sisa tagihan terhitung ulang; pembayaran melebihi sisa tagihan ditolak; lunas saat sisa nol. | BR-008 |  |
| FR-PUR-007 | Sistem mengoreksi pembayaran supplier lewat void. | Pembayaran yang salah di-void dengan alasan; catatan awal tetap terlihat; sisa tagihan terhitung ulang; pembayaran pengganti dapat dicatat. | BR-015 | TBD-12 |
| FR-PUR-008 | Sistem mengoreksi atau membatalkan pembelian dengan riwayat. | Pembelian yang belum diterima dapat dibatalkan dengan alasan; pembelian yang sudah diterima dikoreksi lewat retur atau penyesuaian stok, bukan diubah langsung. | BR-015 | TBD-12 |
| FR-PUR-009 | Sistem mencatat retur barang kepada supplier. | Retur memilih pembelian asal, varian, jumlah, alasan, dan tanggal; hasil retur: pengembalian uang, barang pengganti, atau potongan tagihan; stok berkurang sesuai jumlah retur. | BR-009 | TBD-18 |
| FR-PUR-010 | Sistem menampilkan riwayat pembelian. | Daftar dapat disaring menurut supplier, tanggal, status pembelian, dan status pembayaran; detail menampilkan item, penerimaan, dan pembayaran. | BR-007, BR-008 |  |

### 3.5 Modul Retur Barang

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-RET-001 | Sistem mencatat retur pelanggan yang terhubung ke transaksi penjualan asal. | Retur memilih transaksi asal, varian, jumlah, tanggal, dan alasan; pelaku dan waktu tersimpan; retur tanpa transaksi asal diizinkan dengan penanda khusus. | BR-009 |  |
| FR-RET-002 | Sistem mendukung retur sebagian. | Jumlah retur tidak melebihi jumlah terjual dikurangi jumlah yang sudah diretur; satu transaksi dapat memiliki beberapa retur. | BR-009 |  |
| FR-RET-003 | Sistem mencatat kondisi barang retur. | Kondisi: layak jual atau rusak, dipilih per item setelah pemeriksaan; kondisi tersimpan di riwayat retur. | BR-009 |  |
| FR-RET-004 | Sistem menyesuaikan stok berdasarkan kondisi barang. | Layak jual menambah stok layak jual dan mengurangi HPP barang sebesar HPP saat dijual; rusak masuk stok rusak bernilai nol dan tidak menambah stok layak jual; setiap perubahan tercatat. | BR-009, BR-016 | TBD-07 |
| FR-RET-005 | Sistem mencatat status klaim marketplace. | Status: belum diajukan, dalam proses, disetujui, ditolak; perubahan status menyimpan tanggal dan pengguna. | BR-009 | TBD-06 |
| FR-RET-006 | Sistem mencatat status dana retur terpisah dari status klaim. | Status dana: belum diproses, menunggu pengembalian dana, dana dikembalikan, dana tetap hak penjual, belum dapat dipastikan; mengubah status klaim tidak otomatis mengubah status dana. | BR-009 | TBD-06 |
| FR-RET-007 | Sistem mencatat dampak retur terhadap penjualan, refund, dan HPP. | Dana dikembalikan: refund mengurangi penjualan neto. Dana tetap hak penjual: penjualan neto tidak berkurang. Nilai refund tidak melebihi total item yang diretur; laporan keuntungan memakai nilai ini. | BR-009, BR-012 | TBD-06 |
| FR-RET-008 | Sistem menghapuskan stok rusak dengan alasan. | Penghapusan mengurangi stok rusak; penghapusan barang yang tidak berasal dari retur dicatat sebagai penghapusan persediaan bernilai HPP varian dan masuk laba bersih. | BR-009 | TBD-07 |
| FR-RET-009 | Sistem menampilkan riwayat retur pelanggan dan supplier. | Daftar menampilkan transaksi asal, item, kondisi, status klaim, status dana, dan dampak stok; dapat disaring menurut tanggal, kanal, dan status. | BR-009 |  |

### 3.6 Modul Pengeluaran Operasional

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-EXP-001 | Sistem mencatat pengeluaran operasional. | Data berisi tanggal, kategori, nominal, keterangan, dan pengguna; nominal harus lebih dari nol; pengeluaran muncul di riwayat dan laporan. | BR-017 |  |
| FR-EXP-002 | Sistem mengelola kategori pengeluaran. | Contoh kategori: parkir, transportasi, listrik, lainnya; pengguna dapat menambah dan menonaktifkan kategori; pembelian bahan kemasan tidak termasuk pengeluaran operasional. | BR-010, BR-017 | TBD-21 |
| FR-EXP-003 | Sistem mengoreksi pengeluaran lewat void. | Pengeluaran yang salah di-void dengan alasan; catatan awal tetap terlihat; total pengeluaran periode terhitung ulang. | BR-015, BR-017 | TBD-12 |
| FR-EXP-004 | Sistem menampilkan riwayat pengeluaran. | Daftar dapat disaring menurut tanggal dan kategori; pengeluaran void ditandai dan tidak dihitung di total. | BR-017 |  |

### 3.7 Modul Persediaan Bahan Kemasan

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-PACK-001 | Sistem mengelola data bahan kemasan. | Setiap bahan punya nama, satuan beli, satuan pakai, dan faktor konversi (misalnya 1 roll = 100 meter); batas stok minimum opsional. | BR-010 | TBD-16, TBD-22 |
| FR-PACK-002 | Sistem mencatat pembelian bahan kemasan sebagai persediaan. | Data berisi tanggal, bahan, jumlah beli, harga, dan total; pembelian langsung lunas; stok bertambah dalam satuan pakai; pembelian tidak muncul sebagai pengeluaran operasional. | BR-010 | TBD-15 |
| FR-PACK-003 | Sistem mencatat pemakaian bahan kemasan per transaksi penjualan. | Pengguna memilih bahan dan jumlah pakai pada transaksi; stok berkurang; pemakaian melebihi stok ditolak; pemakaian terhubung ke nomor transaksi. | BR-011 | TBD-09 |
| FR-PACK-004 | Sistem menghitung biaya per satuan pakai dan biaya pemakaian. | Biaya per satuan pakai memakai rata-rata tertimbang bergerak; biaya baris = jumlah pakai × biaya per satuan, dibulatkan ke Rupiah; biaya tersimpan di transaksi dan tidak berubah saat harga beli kemasan berubah. | BR-011 | TBD-03, TBD-16 |
| FR-PACK-005 | Sistem menampilkan stok dan pergerakan stok kemasan. | Setiap pembelian, pemakaian, dan penyesuaian membuat satu catatan; stok awal, masuk, keluar, dan akhir terhitung per periode. | BR-010 |  |
| FR-PACK-006 | Sistem menyediakan penyesuaian stok kemasan. | Data berisi jumlah, waktu, pengguna, dan alasan opsional; stok tidak boleh menjadi negatif. | BR-010 | TBD-09 |
| FR-PACK-007 | Sistem memberi peringatan stok kemasan rendah. | Bahan dengan stok di bawah atau sama dengan batas minimum diberi penanda dan tampil di dashboard. | BR-010, BR-012 | TBD-22 |
| FR-PACK-008 | Sistem menampilkan riwayat pemakaian kemasan. | Daftar dapat disaring menurut tanggal, bahan, dan transaksi; dari transaksi dapat dibuka rincian kemasan yang dipakai. | BR-010 |  |

### 3.8 Modul Dashboard

Semua angka dashboard mengikuti rumus di BRD bagian 5 dan dapat difilter menurut periode (hari ini, 7 hari, bulan ini, rentang bebas).

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-DASH-001 | Dashboard menampilkan ringkasan penjualan. | Menampilkan penjualan neto dan jumlah transaksi pada periode terpilih; transaksi dibatalkan tidak dihitung; angka sama dengan laporan penjualan periode yang sama. | BR-012 |  |
| FR-DASH-002 | Dashboard menampilkan total pengeluaran operasional. | Hanya pengeluaran operasional yang tidak di-void; tidak termasuk pembelian kemasan. | BR-012 |  |
| FR-DASH-003 | Dashboard menampilkan ringkasan keuntungan. | Menampilkan laba kotor dan laba bersih sesuai rumus BRD; angka sama dengan laporan keuntungan. | BR-012 | TBD-03, TBD-04, TBD-06 |
| FR-DASH-004 | Dashboard menampilkan informasi stok produk dan kemasan. | Menampilkan daftar varian dan bahan yang stoknya di bawah atau sama dengan batas minimum; dapat dibuka ke detail. | BR-012, BR-016 | TBD-22 |
| FR-DASH-005 | Dashboard menampilkan pembelian dan tagihan supplier. | Menampilkan total pembelian periode, total sisa tagihan, dan daftar tagihan terlambat. | BR-020 | TBD-17 |
| FR-DASH-006 | Dashboard menampilkan transaksi yang belum selesai. | Menampilkan pesanan berstatus diproses, pembayaran belum dibayar, dan pencairan belum cair atau sebagian. | BR-012 | TBD-14 |
| FR-DASH-007 | Dashboard menampilkan ringkasan arus kas. | Menampilkan kas masuk dan kas keluar periode terpilih menurut tanggal terima dan tanggal bayar. | BR-020 |  |

### 3.9 Modul Riwayat

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-HIST-001 | Sistem menampilkan riwayat penjualan. | Daftar dan detail transaksi; pencarian nomor atau resi; filter tanggal, kanal, dan status; menampilkan pembuat transaksi. | BR-002, BR-014 |  |
| FR-HIST-002 | Sistem menampilkan riwayat pembelian dan penerimaan barang. | Daftar pembelian dengan penerimaannya; filter supplier, tanggal, dan status. | BR-007 |  |
| FR-HIST-003 | Sistem menampilkan riwayat pembayaran. | Pembayaran supplier, pembayaran penjualan, dan pencairan dana marketplace tampil dengan tanggal, nominal, dan pengguna; yang di-void ditandai. | BR-008, BR-014 |  |
| FR-HIST-004 | Sistem menampilkan riwayat retur. | Retur pelanggan dan supplier dalam satu halaman dengan filter jenis dan tanggal. | BR-009 |  |
| FR-HIST-005 | Sistem menampilkan riwayat perubahan stok produk. | Setiap catatan menampilkan jenis, jumlah, saldo, referensi, pengguna, dan waktu. | BR-014, BR-016 |  |
| FR-HIST-006 | Sistem menampilkan riwayat perubahan stok kemasan. | Setiap catatan menampilkan jenis, jumlah, saldo, referensi, pengguna, dan waktu. | BR-014 |  |
| FR-HIST-007 | Sistem menampilkan riwayat status transaksi. | Setiap perubahan status pesanan, pembayaran, dan pencairan tampil beserta waktu dan pengguna. | BR-002, BR-014 |  |
| FR-HIST-008 | Sistem menampilkan riwayat aktivitas pengguna. | Aktivitas penting dapat disaring menurut pengguna, jenis aktivitas, dan tanggal; data tetap ada setelah akun dinonaktifkan. | BR-014 |  |

### 3.10 Modul Laporan

Semua laporan memakai filter periode (harian, bulanan, rentang bebas) dan data historis sesuai waktu transaksi.

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-REPORT-001 | Laporan penjualan. | Menampilkan jumlah transaksi, penjualan neto, dan item terjual menurut periode dan kanal; transaksi dibatalkan tidak dihitung. | BR-012 | TBD-23 |
| FR-REPORT-002 | Laporan pembelian. | Menampilkan total pembelian, rincian item, supplier, dan status pembayaran menurut periode dan supplier. | BR-012 | TBD-23 |
| FR-REPORT-003 | Laporan pengeluaran operasional. | Menampilkan total per kategori menurut periode; pengeluaran void tidak dihitung; pembelian kemasan tidak muncul di sini. | BR-012, BR-017 | TBD-23 |
| FR-REPORT-004 | Laporan persediaan produk. | Menampilkan stok dan nilai persediaan per varian (stok × HPP), stok rusak, dan varian stok rendah. | BR-012 | TBD-03 |
| FR-REPORT-005 | Laporan persediaan kemasan. | Menampilkan stok awal, pembelian, pemakaian, stok akhir, dan nilainya per bahan. | BR-012 | TBD-03 |
| FR-REPORT-006 | Laporan HPP. | Menampilkan HPP barang dan biaya kemasan terpisah per periode dan per transaksi dari snapshot. | BR-011, BR-012 | TBD-03 |
| FR-REPORT-007 | Laporan keuntungan. | Menampilkan penjualan neto, HPP barang, biaya kemasan, laba kotor, biaya marketplace, pengeluaran operasional, penghapusan persediaan, dan laba bersih sesuai rumus BRD; rumus tertulis di laporan. | BR-011, BR-012, BR-019 | TBD-03, TBD-04, TBD-06 |
| FR-REPORT-008 | Laporan pembayaran dan utang supplier. | Menampilkan total pembelian, total dibayar, sisa tagihan, dan tagihan terlambat per supplier. | BR-020 | TBD-17 |
| FR-REPORT-009 | Laporan retur. | Menampilkan retur pelanggan dan supplier menurut kondisi, status klaim, status dana, dan nilai refund. | BR-009, BR-012 | TBD-06 |
| FR-REPORT-010 | Laporan arus kas. | Menampilkan kas masuk (penjualan offline dan dana marketplace yang cair) dan kas keluar (pembayaran supplier, pembelian kemasan, pengeluaran operasional, refund) menurut tanggal terjadi; pembelian tempo baru muncul saat dibayar. | BR-020 | TBD-14, TBD-15 |
| FR-REPORT-011 | Laporan dapat diekspor dan dicetak. | Setiap laporan dapat diunduh sebagai CSV dan dicetak lewat browser; angka ekspor sama dengan tampilan. | BR-012 | TBD-23 |

### 3.11 Modul Pengaturan Sistem

| ID | Requirement | Kriteria penerimaan | BR | TBD |
| --- | --- | --- | --- | --- |
| FR-SET-001 | Pengaturan informasi usaha. | Nama, alamat, dan telepon usaha dapat diubah dan tampil di nota. | BR-018 |  |
| FR-SET-002 | Pengelolaan satuan. | Satuan produk dan kemasan dapat ditambah dan dinonaktifkan; satuan yang dipakai tidak dapat dihapus. | BR-018 | TBD-02 |
| FR-SET-003 | Pengelolaan kanal penjualan. | Kanal dapat ditambah, diubah, dan dinonaktifkan; kanal yang dipakai transaksi tidak dihapus permanen. | BR-018 | TBD-20 |
| FR-SET-004 | Pengelolaan kategori produk dan pengeluaran. | Kategori dapat ditambah, diubah nama, dan dinonaktifkan; riwayat tetap memakai kategori lama. | BR-018 | TBD-21 |
| FR-SET-005 | Pengaturan batas stok minimum. | Batas diisi per varian dan per bahan kemasan; perubahan langsung memengaruhi peringatan. | BR-016, BR-018 | TBD-22 |
| FR-SET-006 | Pengaturan operasional lainnya. | Durasi sesi dan format nota dapat diatur; pengaturan lain ditambahkan hanya setelah disepakati. | BR-018 | TBD-24 |

## 4. Kebutuhan Nonfungsional

Angka target bersifat usulan dan dapat diubah setelah klien menyebutkan volume dan perangkat sebenarnya (TBD-24).

| ID | Aspek | Kebutuhan terukur |
| --- | --- | --- |
| NFR-001 | Autentikasi | Semua halaman dan data internal hanya dapat diakses setelah login. |
| NFR-002 | Keamanan password | Password disimpan dengan hash modern (misalnya bcrypt atau argon2), tidak pernah sebagai teks biasa atau dicatat di log. |
| NFR-003 | Otorisasi | Pemeriksaan akses dilakukan di server pada setiap permintaan, bukan hanya di antarmuka. |
| NFR-004 | Kinerja | Untuk data hingga 10.000 transaksi: halaman utama dan kasir terbuka di bawah 2 detik; pencarian produk menampilkan hasil di bawah 1 detik; laporan bulanan tampil di bawah 5 detik. |
| NFR-005 | Konsistensi data | Operasi yang saling terkait (penjualan, stok, kemasan, HPP) berhasil seluruhnya atau dibatalkan seluruhnya; saldo stok selalu sama dengan jumlah catatan pergerakannya. |
| NFR-006 | Pencegahan transaksi ganda | Mengirim formulir dua kali (klik ganda atau muat ulang) tidak membuat dua transaksi. |
| NFR-007 | Kompatibilitas | Berfungsi di Chrome terbaru pada laptop atau PC dan Android; tata letak kasir dapat dipakai di layar 360 piksel ke atas. |
| NFR-008 | Kemudahan penggunaan | Label formulir jelas, pesan kesalahan berbahasa Indonesia dan menyebut cara memperbaiki; pencatatan penjualan offline dapat diselesaikan dalam kurang dari 6 langkah layar. |
| NFR-009 | Integritas riwayat | Data yang sudah dipakai transaksi tetap dapat ditelusuri walaupun produk, supplier, kanal, atau akun dinonaktifkan. |
| NFR-010 | Validasi data | Sistem menolak nilai kosong yang wajib, kuantitas nol atau negatif, dan nominal tidak valid dengan pesan yang jelas. |
| NFR-011 | Pemeliharaan | Penambahan fitur tidak mengubah data historis; perubahan skema dilakukan lewat migrasi. |
| NFR-012 | Pencadangan data (usulan baru) | Data dicadangkan otomatis setiap hari dan dapat dipulihkan; belum pernah dibahas dengan klien. |

## 5. Aturan Bisnis, Validasi, dan Koreksi Data

### 5.1 Aturan bisnis

SRS memakai aturan bisnis BRULE-001 sampai BRULE-028 dari BRD v0.5 bagian 5 tanpa perubahan. Rumus laba, HPP, dan arus kas juga mengikuti BRD bagian 5.

### 5.2 Aturan validasi

| ID | Aturan |
| --- | --- |
| VR-001 | Nomor transaksi penjualan dan pembelian unik. |
| VR-002 | Barcode unik antarvarian. |
| VR-003 | Kuantitas produk dan kemasan lebih dari nol dan sesuai satuan yang ditentukan. |
| VR-004 | Pembayaran supplier tidak melebihi sisa tagihan. |
| VR-005 | Setiap pembayaran terhubung ke satu pembelian; setiap penerimaan terhubung ke satu pembelian. |
| VR-006 | Jumlah diterima tidak melebihi sisa jumlah pesanan. |
| VR-007 | Jumlah retur tidak melebihi jumlah terjual dikurangi retur sebelumnya. |
| VR-008 | Penjualan, pemakaian kemasan, dan penyesuaian tidak boleh membuat stok negatif. |
| VR-009 | Data yang punya riwayat transaksi tidak dihapus permanen lewat proses operasional biasa. |
| VR-010 | Nilai snapshot harga dan HPP pada transaksi tidak dapat diubah setelah disimpan. |
| VR-011 | Laporan memakai data historis sesuai waktu transaksi, bukan harga terbaru. |
| VR-012 | Diskon tidak membuat total transaksi negatif. |

### 5.3 Penanganan kesalahan dan koreksi

1. Kesalahan input penjualan, pembelian, pembayaran, dan pengeluaran dikoreksi lewat pembatalan (void) atau penyesuaian dengan alasan wajib; catatan awal tetap terlihat.
2. Void membuat catatan pembalik, bukan mengubah angka lama, sehingga laporan periode lampau dapat ditelusuri.
3. Kedua pengelola berwenang melakukan koreksi; pelaku dan waktu tercatat (TBD-12).
4. Data yang tidak lolos validasi ditolak dengan pesan yang menjelaskan bagian yang salah.

## 6. Rancangan Entitas Awal

Bagian ini adalah daftar entitas untuk persiapan ERD. Atribut, kunci, dan relasi final ditentukan pada tahap perancangan database setelah TBD-01, 03, 04, 06, dan 10 dikonfirmasi; ERD sebelum itu hanya berstatus draf.

| No. | Entitas | Fungsi | FR terkait |
| --- | --- | --- | --- |
| 1 | Users | Akun pengelola, status aktif | FR-AUTH |
| 2 | Products | Produk utama | FR-PROD-001 |
| 3 | ProductCategories | Kategori produk | FR-PROD-002, FR-SET-004 |
| 4 | ProductVariants | Varian: barcode, satuan, harga, stok, HPP | FR-PROD-003, 004 |
| 5 | VariantChannelPrices | Harga jual khusus per kanal | FR-SALE-013 |
| 6 | Units | Satuan produk dan kemasan | FR-SET-002 |
| 7 | Suppliers | Data supplier | FR-SUP-001 |
| 8 | VariantSuppliers | Hubungan varian dan supplier (tingkat varian) | FR-PROD-007 |
| 9 | PurchasePriceHistories | Riwayat harga beli per varian | FR-PROD-005 |
| 10 | StockMovements | Pergerakan stok produk, termasuk stok rusak | FR-PROD-008, FR-RET-004 |
| 11 | SalesChannels | Kanal penjualan | FR-SET-003 |
| 12 | Sales | Transaksi penjualan, diskon, biaya tambahan, biaya marketplace | FR-SALE-001 sampai 007 |
| 13 | SaleItems | Item penjualan dengan snapshot harga dan HPP | FR-SALE-012 |
| 14 | SaleStatusHistories | Riwayat status pesanan, pembayaran, pencairan | FR-SALE-008 |
| 15 | SalePayments | Pembayaran penjualan | FR-SALE-001 |
| 16 | MarketplaceSettlements | Pencairan dana marketplace | FR-SALE-009 |
| 17 | Purchases | Pembelian supplier dan status | FR-PUR-001, 002 |
| 18 | PurchaseItems | Item pembelian | FR-PUR-001 |
| 19 | GoodsReceipts | Penerimaan barang | FR-PUR-003 |
| 20 | GoodsReceiptItems | Item yang diterima | FR-PUR-003 |
| 21 | SupplierPayments | Pembayaran supplier, termasuk void | FR-PUR-006, 007 |
| 22 | SupplierReturns | Retur ke supplier | FR-PUR-009 |
| 23 | SupplierReturnItems | Item retur supplier | FR-PUR-009 |
| 24 | CustomerReturns | Retur pelanggan, status klaim, status dana | FR-RET-001 sampai 007 |
| 25 | CustomerReturnItems | Item retur dengan kondisi | FR-RET-002, 003 |
| 26 | MarketplaceClaims | Klaim marketplace, terpisah dari dana | FR-RET-005 |
| 27 | StockWriteOffs | Penghapusan stok rusak | FR-RET-008 |
| 28 | PackagingMaterials | Bahan kemasan, satuan beli, satuan pakai, konversi | FR-PACK-001 |
| 29 | PackagingPurchases | Pembelian kemasan (tunai) | FR-PACK-002 |
| 30 | PackagingMovements | Pergerakan stok kemasan | FR-PACK-005, 006 |
| 31 | SalePackagingUsages | Pemakaian kemasan per transaksi dengan biaya tersimpan | FR-PACK-003, 004 |
| 32 | Expenses | Pengeluaran operasional, termasuk void | FR-EXP-001, 003 |
| 33 | ExpenseCategories | Kategori pengeluaran | FR-EXP-002 |
| 34 | BusinessSettings | Informasi dan pengaturan usaha | FR-SET-001, 006 |
| 35 | ActivityLogs | Riwayat aktivitas pengguna | FR-AUTH-006, FR-HIST-008 |

### Catatan rancangan

1. `VariantSuppliers` berada di tingkat varian karena harga beli melekat pada varian (TBD-25).
2. `StockMovements` dan `PackagingMovements` adalah sumber saldo stok; saldo di tabel utama harus selalu cocok dengan jumlah catatannya.
3. `SaleItems` dan `SalePackagingUsages` menyimpan snapshot harga, HPP, dan biaya.
4. `MarketplaceClaims` dipisah dari `MarketplaceSettlements` karena status klaim tidak selalu sama dengan status dana.
5. Pembayaran, pengeluaran, dan transaksi memakai penanda void dan pembuat void, bukan penghapusan baris.
6. Entitas dapat digabung atau disederhanakan pada tahap ERD selama kebutuhan pencatatan tetap terpenuhi.

## 7. TBD dan Dampaknya pada Requirement

ID dan isi TBD sama dengan BRD v0.5 bagian 8 (pertanyaan dan asumsi lengkap ada di sana). Tabel ini menunjukkan requirement yang harus ditinjau ulang jika jawaban klien berbeda dari asumsi. Prioritas menunjukkan pengaruhnya pada struktur database.

| TBD | Topik | Prioritas | Requirement terdampak |
| --- | --- | --- | --- |
| TBD-01 | Stok varian | Tinggi | FR-PROD-003 |
| TBD-02 | Satuan produk | Sedang | FR-PROD-003, FR-SET-002 |
| TBD-03 | Metode HPP | Tinggi | FR-SALE-012, FR-PROD-006, FR-PACK-004, FR-DASH-003, FR-REPORT-004 sampai 007 |
| TBD-04 | Biaya marketplace | Tinggi | FR-SALE-007, FR-DASH-003, FR-REPORT-007 |
| TBD-05 | Harga per kanal | Sedang | FR-SALE-013 |
| TBD-06 | Retur marketplace dan dana | Tinggi | FR-RET-005 sampai 007, FR-DASH-003, FR-REPORT-007, 009 |
| TBD-07 | Barang rusak | Sedang | FR-RET-004, FR-RET-008 |
| TBD-08 | Penerimaan sebagian | Sedang | FR-PUR-002, FR-PUR-003 |
| TBD-09 | Stok negatif | Sedang | FR-SALE-011, FR-PROD-009, FR-PACK-003, FR-PACK-006 |
| TBD-10 | Waktu pengurangan stok | Tinggi | FR-SALE-011 |
| TBD-11 | Pembatalan penjualan | Sedang | FR-SALE-010 |
| TBD-12 | Koreksi data | Sedang | FR-PUR-007, FR-PUR-008, FR-EXP-003 |
| TBD-13 | Diskon dan biaya tambahan | Rendah | FR-SALE-005, FR-SALE-006 |
| TBD-14 | Status dan metode pembayaran | Sedang | FR-SALE-001, 008, 009, FR-DASH-006, FR-REPORT-010 |
| TBD-15 | Pembelian kemasan tunai atau tempo | Sedang | FR-PACK-002, FR-REPORT-010 |
| TBD-16 | Pembulatan dan konversi satuan | Sedang | FR-SALE-014, FR-PACK-001, FR-PACK-004 |
| TBD-17 | Jatuh tempo | Sedang | FR-PUR-005, FR-DASH-005, FR-REPORT-008 |
| TBD-18 | Retur supplier | Sedang | FR-PUR-009 |
| TBD-19 | Pengelolaan akun | Rendah | FR-AUTH-003, FR-AUTH-004 |
| TBD-20 | Kanal penjualan | Rendah | FR-SALE-003, FR-SET-003 |
| TBD-21 | Kategori | Rendah | FR-PROD-002, FR-EXP-002, FR-SET-004 |
| TBD-22 | Batas stok minimum | Rendah | FR-PROD-010, FR-PACK-001, 007, FR-DASH-004, FR-SET-005 |
| TBD-23 | Laporan | Rendah | FR-REPORT-001 sampai 003, FR-REPORT-011 |
| TBD-24 | Perangkat, nota, offline | Rendah | FR-SALE-002, FR-SALE-015, FR-PROD-004, FR-SET-006, NFR-007 |
| TBD-25 | Supplier dan varian | Sedang | FR-PROD-007 |

## 8. Kriteria Penerimaan Sistem

Kriteria berstatus *Blocked* baru dapat dinyatakan lulus setelah TBD terkait dikonfirmasi atau asumsinya disetujui.

| No. | Kriteria | Status pengujian |
| --- | --- | --- |
| 1 | Pengguna dapat login dan logout; halaman internal tertutup tanpa login. | Dapat diuji |
| 2 | Kedua akun pengelola memakai semua fitur operasional dengan hak setara. | Dapat diuji |
| 3 | Produk, varian, kategori, dan barcode dapat dikelola; scan barcode menemukan varian di kasir. | Blocked: TBD-01, TBD-02 |
| 4 | Penjualan offline dan marketplace dapat dicatat dengan status, pembatalan, dan nota. | Blocked: TBD-10, TBD-11, TBD-13, TBD-14 |
| 5 | Harga jual dan HPP historis tidak berubah ketika harga diperbarui. | Blocked: TBD-03 |
| 6 | Pembelian multi-barang, penerimaan barang, dan pembayaran supplier bertahap dapat dicatat; stok hanya bertambah dari barang diterima. | Blocked: TBD-08 |
| 7 | Tagihan supplier dengan jatuh tempo dan keterlambatan tampil di dashboard dan laporan. | Blocked: TBD-17 |
| 8 | Retur pelanggan dan supplier dapat dicatat; status klaim terpisah dari status dana. | Blocked: TBD-06, TBD-07, TBD-18 |
| 9 | Bahan kemasan dapat dibeli, dipakai, dan dipantau; biaya masuk HPP saat dipakai. | Blocked: TBD-03, TBD-15, TBD-16 |
| 10 | Pengeluaran operasional tercatat terpisah dari HPP dan kemasan. | Dapat diuji |
| 11 | Penjualan atau pemakaian melebihi stok ditolak. | Blocked: TBD-09 |
| 12 | Laporan keuntungan dan arus kas menghasilkan angka yang sama dengan hitungan manual pada data uji. | Blocked: TBD-03, TBD-04, TBD-06 |
| 13 | Dashboard dan laporan memakai angka yang sama untuk periode yang sama. | Dapat diuji |
| 14 | Void pembelian, pembayaran, dan pengeluaran meninggalkan riwayat dan menghitung ulang total. | Blocked: TBD-12 |
| 15 | Riwayat stok, status, dan aktivitas pengguna dapat ditelusuri. | Dapat diuji |
| 16 | Pengaturan kanal, kategori, satuan, dan batas stok dapat diubah dan langsung berlaku. | Dapat diuji |

## 9. Matriks Keterlacakan BRD ke SRS

Setiap BR di BRD v0.5 punya minimal satu requirement di SRS.

| ID BRD | Kebutuhan bisnis | Requirement SRS |
| --- | --- | --- |
| BR-001 | Penjualan offline dan marketplace | FR-SALE-001, 003, 004, 013 |
| BR-002 | Transaksi terstruktur, status, pembatalan, nota | FR-SALE-001, 005, 006, 008, 010, 015; FR-HIST-001, 007 |
| BR-003 | Harga dan HPP historis | FR-SALE-012; FR-PROD-005 |
| BR-004 | Varian produk | FR-PROD-001, 002, 003 |
| BR-005 | Barcode | FR-PROD-004; FR-SALE-002 |
| BR-006 | Varian dan banyak supplier | FR-PROD-007; FR-SUP-001 |
| BR-007 | Pembelian dan penerimaan barang | FR-PUR-001, 002, 003, 010; FR-PROD-005; FR-HIST-002 |
| BR-008 | Pembelian tempo dan bertahap | FR-PUR-004, 006, 010; FR-HIST-003 |
| BR-009 | Retur pelanggan dan supplier | FR-PUR-009; FR-RET-001 sampai 009; FR-HIST-004 |
| BR-010 | Persediaan kemasan terpisah | FR-PACK-001, 002, 005 sampai 008; FR-EXP-002 |
| BR-011 | Perhitungan HPP | FR-SALE-014; FR-PROD-006; FR-PACK-003, 004; FR-REPORT-006 |
| BR-012 | Dashboard dan laporan | FR-DASH-001 sampai 004, 006; FR-REPORT-001 sampai 007, 009, 011 |
| BR-013 | Dua akun setara | FR-AUTH-001 sampai 005, 007 |
| BR-014 | Riwayat aktivitas | FR-AUTH-006; FR-HIST-001, 003, 005 sampai 008 |
| BR-015 | Perlindungan data historis | FR-PROD-011; FR-SUP-001; FR-SALE-010; FR-PUR-007, 008; FR-EXP-003; FR-AUTH-004 |
| BR-016 | Pengelolaan stok | FR-PROD-008, 009, 010; FR-SALE-011; FR-SET-005 |
| BR-017 | Pengeluaran operasional | FR-EXP-001 sampai 004; FR-REPORT-003 |
| BR-018 | Pengaturan sistem | FR-SET-001 sampai 006 |
| BR-019 | Biaya marketplace | FR-SALE-007, 009; FR-REPORT-007 |
| BR-020 | Arus kas dan utang supplier | FR-PUR-005; FR-SALE-009; FR-DASH-005, 007; FR-REPORT-008, 010 |

## 10. Riwayat Perubahan Dokumen

| Versi | Tanggal | Perubahan |
| --- | --- | --- |
| 0.3 | 12 November 2026 | Revisi berdasarkan BRD v0.4. |
| 0.4 | 13 November 2026 | Acuan BRD v0.5; ID aturan bisnis memakai BRULE (dirujuk dari BRD); kriteria penerimaan dikembalikan di setiap FR; TBD diselaraskan menjadi 25 butir; ditambah FR otorisasi server, diskon, biaya marketplace, pencairan dana, jatuh tempo, void, laporan arus kas, ekspor, kategori produk; NFR terukur dan anti transaksi ganda; matriks keterlacakan mencakup BR-001 sampai BR-020. |

**Status: Draft Revision, menunggu review dan konfirmasi klien.**
