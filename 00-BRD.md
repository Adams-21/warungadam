# Business Requirements Document (BRD)
**Nama Proyek:** WarungAdam v2 (POS & Inventory System)  
**Versi:** 2.0  
**Tanggal:**19 Oktober 2026  
**Metodologi:** Agentic Engineering / The New SDLC  
**INI ADALAH BRD KASAR YANG BELUM FINAL**

---

## 1. Executive Summary (Ringkasan Eksekutif)
WarungAdam v2 adalah sistem Point of Sale (POS) dan Inventarisasi berbasis web (Offline-First PWA) yang dirancang secara spesifik untuk memodelkan ritme dan karakteristik operasional **Warung Madura**. Warung Madura beroperasi selama 24 jam non-stop, mengandalkan serah terima shift pasangan/berganti penjaga, memproses transaksi cepat (seperti rokok, eceran, dan barang laris), serta mencatat utang/kasbon pelanggan. Sistem ini dibuat untuk mempercepat pelayanan kasir, menjamin presisi stok, mencegah kebocoran kas, dan menekan kerugian akibat barang kedaluwarsa.

---

## 2. Business Objectives & Success Metrics (Tujuan Bisnis & Indikator Keberhasilan)

### 2.1. Tujuan Bisnis
1. **Efisiensi & Kecepatan Transaksi**: Memangkas waktu checkout transaksi kasir agar pelayanan berjalan kilat.
2. **Akurasi Stok & Finansial**: Menghilangkan selisih stok antara fisik barang dan sistem serta mencatat seluruh arus kas (tunai & utang).
3. **Akuntabilitas Pergantian Shift**: Menyediakan mekanisme rekonsiliasi kas yang transparan untuk operasional 24 jam.
4. **Pencegahan Kerugian (Loss Prevention)**: Mengidentifikasi produk mendekati *expired date* dan memproteksi fitur sensitif dari manipulasi oknum.

### 2.2. Success Metrics (Metrik Keberhasilan Kuantitatif)
* **Kecepatan Checkout**: < 10 detik per transaksi kasir.
* **Presisi Potong Stok**: 100% real-time potong stok otomatis tanpa selisih via database transaction (`db.$transaction`).
* **Toleransi Selisih Kas Shift**: 0% selisih yang tidak tercatat saat serah terima shift.
* **Uptime Operasional**: 99.9% ketersediaan sistem transaksi kasir (berjalan offline saat koneksi internet terputus).

---

## 3. Operational Domain Context (Karakteristik & Analisis Warung Madura)

1. **Operasional 24 Jam & Pergantian Shift (Shift Reconciliation)**:
   * Penjagaan dilakukan secara bergiliran (biasanya pasangan suami-istri atau kerabat).
   * Dibutuhkan sistem rekap kas per shift sebelum pergantian penjaga tanpa perlu menghentikan operasional toko.
2. **Transaksi Kilat (Fast-Paced Checkout)**:
   * Produk paling sering dibeli (rokok, bensin eceran, mie instan, minuman dingin) harus bisa diakses dalam 1-2 klik/tombol cepat tanpa scan barcode yang rumit.
3. **Buku Kasbon / Utang Tetangga (Debt Tracking)**:
   * Transaksi utang merupakan hal lumrah pada Warung Madura. Sistem harus mampu mencatat nama pelanggan, tanggal utang, nominal, dan riwayat pelunasan secara rapi.
4. **Multi-Unit Pricing & Packaging**:
   * Penjualan dilakukan dalam berbagai satuan (Dus, Pak, atau Eceran/Pcs). Sistem harus otomatis mengonversi dan memotong stok sesuai satuan yang dijual.
5. **Kondisi Jaringan & Hardware Sederhana**:
   * Perangkat yang digunakan berupa laptop/HP kasir dengan koneksi internet yang kadang fluktuatif atau terputus.

---

## 4. Stakeholders & User Personas

| Peran | Deskripsi | Responsibilitas & Kebutuhan Kunci |
| :--- | :--- | :--- |
| **Owner (Pemilik Warung)** | Pemilik modal / pengelola utama warung. | Akses laporan omzet/keuntungan, proteksi PIN Gate 4-digit, stok opname, dan manajemen harga produk. |(OPSIONAL)
| **Kasir / Penjaga Shift** | Operator harian transaksi kasir. | Antarmuka kasir cepat (Responsive Split Layout), pencarian produk kilat, kalkulator kembalian otomatis, dan rekap kas shift. |
| **Pelanggan (Langganan)** | Pembeli di warung (termasuk yang berutang). | Mendapatkan transparansi pencatatan kasbon/utang dan struk transaksi. |

---

## 5. Scope Boundaries (Cakupan Proyek)

### 5.1. Dalam Cakupan (In-Scope)
* **Modul Auth & Session Store**: Login toko, manajemen role (Owner & Kasir).
* **Modul POS Kasir Kilat**: Responsive Split-Layout, Grid Quick-Buttons untuk produk laris, kalkulator kembalian instan, dan keranjang belanja real-time (Zustand).
* **Modul Inventaris & Multi-Unit**: CRUD Produk, Kategori, Notifikasi Barang Kadaluwarsa (*Expired Alert*), dan konversi satuan grosir-eceran.
* **Modul Rekonsiliasi Shift & Laporan Kas**: Input nominal kas fisik laci sebelum serah terima shift dan perhitungan *expected vs actual cash*.
* **Modul Pencatatan Utang / Kasbon**: Manajemen riwayat utang pelanggan dan modul pelunasan bertahap/lunas.
* **Keamanan PinGate**: Keamanan PIN 4-Digit Owner untuk pembatalan nota (*void transaction*), diskon manual, dan perubahan harga/stok.
* **Offline-First Support (PWA)**: Penyimpanan transaksi lokal saat offline via LocalStorage/IndexedDB dan auto-sync saat online.

### 5.2. Luar Cakupan (Out-of-Scope - Fase v2.0)
* Integrasi Payment Gateway / EDC Bank / QRIS otomatis (Fokus pada Tunai & Kasbon dulu).
* Manajemen Multi-Cabang / Multi-Toko.
* E-Commerce / Pemesanan *Online Delivery* oleh pembeli.

---

## 6. Risk Analysis & Technical Mitigation Strategies (Analisis Risiko & Solusi)

| No | Risiko Terburuk (Risk Event) | Dampak Bisnis | Solusi Arsitektur / Teknis (Mitigasi) |
| :--- | :--- | :--- | :--- |
| **1** | **Koneksi Internet Mati / Lemah** | Transaksi terhenti, antrean menumpuk, penjaga beralih ke catat manual lagi. | **Offline-First PWA**: Transaksi disimpan di LocalStorage/IndexedDB dan di-sync otomatis ke PostgreSQL saat online. |
| **2** | **Proses Input Kasir Lambat** | Penjaga malas memakai sistem karena kalah cepat dibanding kalkulator biasa. | **Quick Grid Buttons & Shortcut Navigation**: Tombol produk terlaris berukuran besar dan dukungan *keyboard-only navigation* (Enter, Esc, Arrow keys). |
| **3** | **Selisih Kas saat Pergantian Shift** | Sengketa uang tunai antarpenjaga/pemilik warung 24 jam. | **Shift Reconcile & Lock**: Fitur tutup kas shift wajib mencatat kas fisik. Laporan shift langsung dikunci setelah *checkout shift*. |
| **4** | **Manipulasi Transaksi oleh Oknum** | Pembatalan nota (*void*) secara sepihak untuk mengantongi uang kasir. | **PinGate (PIN 4-Digit Owner)**: Setiap pembatalan nota, potong harga manual, atau ubah stok wajib menginput PIN Pemilik. |
| **5** | **Gagal Potong Stok Akibat Concurrency** | Stok fisik habis tapi di sistem masih ada (atau sebaliknya). | **Atomic Transactions (`db.$transaction`)**: Memastikan perubahan stok dan pembuatan invoice berjalan sukses secara serentak. |

---

## 7. Non-Functional Requirements (Kebutuhan Non-Fungsional)

1. **Usability**: UI sederhana dengan kontras tinggi, mudah digunakan di layar sentuh laptop/HP tanpa pelatihan rumit.
2. **Reliability & Data Integrity**: Data transaksi tidak boleh hilang saat terjadi pemadaman listrik atau browser tertutup tiba-tiba.
3. **Security**: Password dienkripsi (*hashed*) dan PIN Gate menggunakan otentikasi ketat server-side/action state.