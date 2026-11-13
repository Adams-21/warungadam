# CLIENT REQUIREMENTS CONFIRMATION

## BizManage — Modul 2: Produk & Stok

**Versi Dokumen:** 1.0  
**Tanggal Konfirmasi:** 9 November 2026  
**Status:** Confirmed by Client

---

## 1. Tujuan

Dokumen ini berisi hasil konfirmasi kebutuhan sistem pada Modul Produk & Stok berdasarkan jawaban yang telah diberikan oleh klien.

Seluruh poin di bawah menjadi acuan dalam penyusunan BRD, SRS, desain database, dan pengembangan sistem BizManage.

## 2. Hasil Konfirmasi Kebutuhan

| No. | Kebutuhan | Jawaban Klien | Status |
|---|---|---|---|
| 1 | Varian produk | Satu produk dapat memiliki beberapa varian kemasan atau ukuran, seperti minyak pouch 800 ml, 1 liter, 2 liter, dan botol. | Disetujui |
| 2 | Input barcode | Sistem menyediakan input melalui scan barcode maupun input manual. | Disetujui |
| 3 | Supplier produk | Satu produk dapat memiliki beberapa supplier. | Disetujui |
| 4 | Alamat supplier | Alamat supplier dapat disimpan, tetapi tidak wajib diisi. | Disetujui |
| 5 | Riwayat harga beli | Sistem mencatat perubahan harga beli apabila terjadi kenaikan harga. | Disetujui |
| 6 | Peringatan stok | Sistem menyediakan notifikasi stok menipis dan pengurutan produk secara otomatis. | Disetujui |
| 7 | Penghapusan produk | Produk yang sudah pernah dijual hanya dapat dinonaktifkan, bukan dihapus permanen. | Disetujui |
| 8 | Alasan perubahan stok | Perubahan stok secara manual perlu menyediakan kolom alasan, tetapi pengisiannya bersifat opsional. | Disetujui |

## 3. Ketentuan Sistem Berdasarkan Konfirmasi

Berdasarkan jawaban klien, sistem direncanakan memiliki ketentuan berikut:

1. Setiap produk dapat memiliki beberapa varian dengan ukuran atau kemasan berbeda.
2. Setiap varian dapat memiliki identitas barcode sendiri.
3. Pengguna dapat memasukkan barcode melalui scanner atau secara manual.
4. Satu produk dapat terhubung dengan lebih dari satu supplier.
5. Informasi alamat supplier bersifat opsional.
6. Perubahan harga beli disimpan sebagai riwayat agar harga pembelian sebelumnya tetap dapat ditelusuri.
7. Sistem memberikan peringatan ketika stok mencapai batas minimum.
8. Produk dengan stok menipis dapat ditampilkan melalui pengurutan atau filter otomatis.
9. Produk yang memiliki riwayat transaksi tidak dapat dihapus permanen.
10. Perubahan stok manual menyediakan kolom alasan yang tidak wajib diisi.

## 4. Catatan Pengembangan

Beberapa detail teknis masih perlu ditentukan pada tahap SRS dan perancangan database, antara lain:

- Apakah stok setiap varian disimpan secara terpisah.
- Apakah terdapat konversi satuan antarvarian.
- Bagaimana penentuan batas minimum stok.
- Bagaimana sistem menghubungkan riwayat harga beli dengan masing-masing supplier.
- Jenis scanner barcode yang akan digunakan.

Catatan tersebut tidak mengubah hasil konfirmasi kebutuhan, tetapi menjadi detail teknis yang perlu dirancang sebelum implementasi.

## 5. Kesimpulan

Seluruh 8 kebutuhan pada Modul Produk & Stok telah mendapatkan jawaban dan persetujuan dari klien.

Dengan demikian, Modul Produk & Stok dinyatakan **Confirmed by Client** dan dapat digunakan sebagai dasar pembaruan dokumen BRD serta penyusunan SRS.

---

**Dokumen:** Client Requirements Confirmation  
**Proyek:** BizManage  
**Modul:** Produk & Stok  
**Status:** Confirmed by Client