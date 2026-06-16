# CodeFlow AI

CodeFlow AI adalah code editor berbasis web dengan AI assistant bawaan. Kamu membuka folder project langsung dari browser (lewat File System Access API, tanpa upload file ke server), lalu mengedit, men-generate, dan menjalankan kode dengan bantuan AI — semua dari satu tab browser.

Editor menggunakan Monaco (mesin yang sama dengan VS Code). AI assistant bisa membaca file yang sedang terbuka, membuat file baru, mengedit beberapa file sekaligus, mencari dokumentasi terbaru di internet saat dibutuhkan, dan menjalankan perintah shell langsung di terminal terintegrasi.

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur](#arsitektur)
- [Persyaratan](#persyaratan)
- [Instalasi & Menjalankan (Development)](#instalasi--menjalankan-development)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Konfigurasi AI Provider](#konfigurasi-ai-provider)
- [Panduan Fitur](#panduan-fitur)
- [Struktur Project](#struktur-project)
- [FAQ](#faq)

## Fitur Utama

**Editor berbasis browser, tanpa upload file**
Folder project dibuka langsung dari disk lewat File System Access API (Chrome/Edge). File tidak pernah dikirim ke server — hanya teks yang kamu ketik di chat dan isi file yang sedang aktif yang dikirim ke AI provider saat diperlukan. Project berformat ZIP juga didukung sebagai mode baca saja.

**AI Gateway dengan fallback otomatis**
Satu permintaan AI dicoba ke beberapa provider secara berurutan (GitHub Models, Cloudflare, Groq, Z.AI, Gemini, Mistral, SambaNova, OpenRouter, Ollama). Kalau satu provider gagal atau limit, sistem otomatis pindah ke provider berikutnya tanpa kamu harus mengulang permintaan.

**Mode OpenCode (agentic)**
Selain AI Gateway biasa, tersedia toggle untuk beralih ke [OpenCode](https://github.com/sst/opencode) — agent CLI yang bisa menjalankan rangkaian aksi (baca file, edit, jalankan command) secara mandiri berdasarkan satu instruksi.

**Prompt Optimizer**
Toggle opsional yang memproses pesanmu lewat dua tahap AI sebelum dikirim ke model utama: tahap pertama menganalisis kebutuhan teknis (arsitektur, file yang terdampak, pertimbangan UI/UX), tahap kedua menulis ulang jadi instruksi yang lebih presisi untuk AI coding.

**Web browsing terarah**
AI bisa mencari informasi terbaru di internet (lewat Tavily atau Firecrawl) ketika kamu memintanya — termasuk mode "hanya dari sumber resmi" yang membatasi hasil ke domain dokumentasi resmi.

**Multi-file generation, auto-apply, dan diff viewer**
AI bisa membuat atau mengubah beberapa file sekaligus dalam satu balasan. Setiap perubahan bisa direview di diff viewer sebelum diterapkan, atau diterapkan otomatis lewat mode Auto-Apply.

**Terminal dan Preview terintegrasi**
Terminal shell sungguhan (PowerShell/bash) yang berjalan tepat di folder project yang sedang dibuka, plus panel Preview yang otomatis mendeteksi apakah project adalah situs statis (HTML biasa) atau aplikasi yang butuh dev server (`npm run dev`).

## Arsitektur

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│        apps/web              │        │          apps/api              │
│   Next.js 15 + Monaco         │◄──────►│   NestJS + Fastify              │
│   Zustand (state)             │  HTTP/  │                                 │
│   File System Access API      │  WS     │  AI Gateway  · OpenCode         │
│   (baca/tulis file lokal)     │        │  Prompt Optimizer · Web Search  │
│                                │        │  Terminal (node-pty) · Preview  │
└─────────────────────────────┘        └──────────────────────────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          ▼                          ▼
                                  AI Provider APIs           opencode CLI
                                  (Groq, Gemini, dst.)        (subprocess)
```

Tidak ada database. Status kesehatan provider dan rate limit disimpan di memory backend (hilang saat backend di-restart — ini keputusan desain yang disengaja untuk menjaga stack tetap sederhana).

| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 15, React, Monaco Editor, Zustand, Tailwind |
| Backend | NestJS 10 dengan adapter Fastify |
| Akses file | File System Access API (browser), JSZip (mode ZIP) |
| Terminal | node-pty + xterm.js, dihubungkan lewat Socket.IO |
| Agent | [OpenCode CLI](https://github.com/sst/opencode) dipanggil sebagai subprocess |
| Web search | Tavily (utama), Firecrawl (fallback) |
| Monorepo | Turborepo + pnpm workspaces |

## Persyaratan

- Node.js 20.11 atau lebih baru
- pnpm 10 atau lebih baru (`npm install -g pnpm`)
- Browser berbasis Chromium (Chrome, Edge, Brave) — File System Access API belum didukung Firefox/Safari
- Minimal satu API key dari AI provider yang didukung (lihat [Konfigurasi AI Provider](#konfigurasi-ai-provider)) — tanpa ini, AI assistant tidak akan merespons
- (Opsional) [OpenCode CLI](https://github.com/sst/opencode) terinstal global jika ingin memakai mode OpenCode: `npm install -g opencode-ai`
- (Opsional, Windows) Visual Studio Build Tools dengan workload "Desktop development with C++" — diperlukan agar `node-pty` (dipakai fitur Terminal) berhasil di-compile saat `pnpm install`

## Instalasi & Menjalankan (Development)

```bash
git clone <repository-url>
cd codeflow-ai
pnpm install
```

Siapkan environment variable backend:

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` dan isi minimal satu API key provider (lihat bagian provider di bawah). Tanpa ini, chat AI tetap bisa diketik tapi backend akan menjawab error "semua provider gagal".

Jalankan kedua aplikasi sekaligus dari root folder:

```bash
pnpm dev
```

Frontend berjalan di `http://localhost:3000`, backend di `http://localhost:4000`. Buka `http://localhost:3000` di Chrome atau Edge, lalu klik **Open Folder** untuk memilih folder project yang ingin diedit.

## Menjalankan dengan Docker

Cocok untuk deployment ke server, atau menjalankan stack lengkap tanpa setup Node.js lokal.

```bash
cp .env.example .env
```

Edit `.env` — isi API key provider, dan **jika diakses dari komputer lain** (bukan dari mesin Docker itu sendiri), wajib ubah tiga variabel ini ke alamat yang bisa dijangkau browser kamu:

```env
NEXT_PUBLIC_API_URL=http://<ip-server>:4000
API_PUBLIC_URL=http://<ip-server>:4000
CORS_ORIGIN=http://<ip-server>:3000
```

> `NEXT_PUBLIC_API_URL` di-bake ke dalam bundle JavaScript saat image dibangun. Mengubah nilainya di `.env` setelah image sudah dibangun **tidak akan berpengaruh** sampai kamu rebuild: `docker compose build --no-cache web`.

Jalankan:

```bash
docker compose up -d --build
```

Cek status:

```bash
docker compose ps
docker compose logs -f api
```

**Mode development dengan hot reload** (bind mount source code, tidak perlu rebuild image setiap ubah kode):

```bash
docker compose -f docker-compose.dev.yml up
```

**Menjalankan Ollama lokal di dalam container** (opsional, bukan default):

```bash
docker compose --profile ollama up -d
```

**Mengedit folder project lewat Docker**
Set `PROJECTS_DIR` di `.env` ke folder host yang berisi project-project kamu (misalnya `D:\Projects` atau `/srv/codeflow-projects`). Folder ini otomatis terhubung ke `/workspace/projects` di dalam container `api`. Di Project Path pada UI CodeFlow AI, gunakan path di dalam container, contoh `/workspace/projects/nama-project` — bukan path Windows/Linux aslinya.

**Jaringan dengan proxy HTTP/HTTPS korporat**
Isi `HTTP_PROXY`, `HTTPS_PROXY`, dan `NO_PROXY` di `.env`. Nilai ini otomatis diteruskan ke proses build Docker maupun runtime container, mencakup `pnpm install`, panggilan ke AI provider, web search, dan `npm`/`git`/`opencode` di dalam container.

**DNS bermasalah di dalam container**
Set `DOCKER_DNS_1` dan `DOCKER_DNS_2` di `.env` (default `1.1.1.1` dan `8.8.8.8`) jika container tidak bisa resolve domain meski koneksi internet host normal.

## Konfigurasi AI Provider

Semua provider bersifat opsional satu sama lain — isi sebanyak yang kamu punya. Lebih banyak provider terisi berarti fallback chain lebih panjang dan AI Gateway lebih jarang gagal total.

| Provider | Env Variable | Catatan |
|---|---|---|
| GitHub Models | `GITHUB_MODELS_API_KEY` | Akses ke model OpenAI/Meta/Mistral lewat GitHub |
| Cloudflare Workers AI | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | |
| Groq | `GROQ_API_KEY` | Inferensi sangat cepat |
| Z.AI | `ZAI_API_KEY` | Model GLM |
| Gemini | `GEMINI_API_KEY` | Google AI Studio |
| Mistral | `MISTRAL_API_KEY` | Termasuk model Codestral |
| SambaNova | `SAMBANOVA_API_KEY` | |
| OpenRouter | `OPENROUTER_API_KEY` | Akses ke banyak model, termasuk tier gratis |
| Ollama | `OLLAMA_BASE_URL` | Tidak butuh API key — jalankan model lokal di komputer/server sendiri |
| Tavily / Firecrawl | `TAVILY_API_KEY`, `FIRECRAWL_API_KEY` | Untuk fitur web browsing AI, bukan untuk chat utama |

Provider dicoba dalam urutan tertentu berdasarkan jenis permintaan (misalnya permintaan dokumentasi mengutamakan provider berbeda dari permintaan refactor cepat) — kamu tidak perlu mengatur urutan ini secara manual.

## Panduan Fitur

### Membuka project

Di halaman awal, klik **Open Folder** dan pilih folder di komputer kamu. Browser akan minta izin akses — ini normal, file tidak pernah meninggalkan komputermu kecuali isi file yang sedang aktif dikirim ke AI saat kamu mengirim chat. Alternatifnya, klik **Open ZIP** untuk membuka arsip ZIP dalam mode baca saja (perubahan tidak tersimpan ke ZIP aslinya).

### Mengirim instruksi ke AI

Ketik permintaan di panel AI Assistant di sisi kanan. Kalau ada file yang sedang terbuka di editor, isinya otomatis disertakan sebagai konteks. AI akan menjawab dengan penjelasan dan/atau blok kode.

Untuk permintaan yang menghasilkan beberapa file (misalnya "buatkan HTML, CSS, dan JavaScript"), AI akan menandai setiap file dengan label tebal sebelum blok kodenya, dan CodeFlow AI menampilkan tombol terpisah untuk membuat setiap file, atau satu tombol untuk membuat semuanya sekaligus.

### Auto-Apply vs review manual

Secara default, setiap perubahan yang diusulkan AI muncul di **diff viewer** terlebih dulu — kamu bisa membandingkan versi lama dan baru sebelum klik **Apply**. Kalau ingin perubahan langsung tersimpan tanpa review (cocok untuk iterasi cepat), aktifkan toggle **Auto Apply** di header.

### Toggle OpenCode

Tombol **Gateway / OpenCode** di header menentukan mesin pemrosesan instruksi kamu:

- **Gateway** (default): AI Gateway internal CodeFlow AI, lewat provider yang sudah dikonfigurasi
- **OpenCode**: instruksi diteruskan ke [OpenCode CLI](https://github.com/sst/opencode) yang berjalan sebagai proses terpisah, cocok untuk tugas yang butuh beberapa langkah berurutan (baca file → analisis → edit → verifikasi)

Mode OpenCode butuh binary `opencode` terinstal di mesin tempat backend berjalan (`npm install -g opencode-ai`).

### Toggle Optimize (Prompt Optimizer)

Tombol **Optimize** di header mengaktifkan pemrosesan dua tahap sebelum instruksimu dikirim ke AI utama:

1. Tahap analisis — meninjau kebutuhan teknis, file yang terdampak, dan pertimbangan UI/UX
2. Tahap penulisan ulang — mengubah hasil analisis jadi instruksi yang lebih presisi untuk AI coding

Berguna untuk permintaan yang ditulis singkat atau ambigu. Permintaan yang sangat pendek (di bawah 12 karakter) dilewati otomatis karena tidak cukup substansial untuk dioptimasi.

### Web browsing

AI akan mencari di internet secara otomatis ketika permintaanmu mengandung kata kunci seperti "cari di internet", "dokumentasi resmi", atau "versi terbaru". Untuk membatasi hasil hanya dari sumber resmi, sertakan frasa seperti "gunakan hanya dokumentasi resmi" dalam permintaanmu.

### Terminal

Buka tab **Terminal** di panel bawah. Saat pertama kali dibuka, kamu akan diminta mengisi **Project Path** — path absolut ke folder project di disk (sama dengan folder yang kamu buka di explorer). Setelah diisi, terminal akan langsung berada di folder tersebut.

### Preview

Buka tab **Preview** di panel bawah. Sistem otomatis mendeteksi jenis project:

- Kalau ditemukan `index.html` (langsung atau di `public/`, `dist/`, `build/`) → disajikan langsung sebagai file statis
- Kalau ditemukan `package.json` → menjalankan `npm run dev` dan menunggu dev server siap

## Struktur Project

```
codeflow-ai/
├── apps/
│   ├── web/                  # Frontend Next.js
│   │   └── src/
│   │       ├── app/          # Routing App Router
│   │       ├── components/   # Komponen UI per fitur
│   │       ├── stores/       # State Zustand (ai, editor, explorer, settings, diff)
│   │       └── lib/          # Klien API, adapter file system, util
│   └── api/                  # Backend NestJS
│       └── src/modules/
│           ├── ai-gateway/       # Routing AI + fallback antar-provider
│           ├── providers/        # Wrapper tiap AI provider
│           ├── prompt-optimizer/ # Pipeline 2 tahap (analisis → rewrite)
│           ├── opencode/         # Integrasi OpenCode CLI
│           ├── web-search/       # Tavily/Firecrawl
│           ├── terminal/         # Shell lewat node-pty + WebSocket
│           ├── preview/          # Deteksi & penyajian preview
│           └── skills/           # Prompt khusus (explain, refactor, docs)
├── packages/shared/           # Tipe & konstanta yang dipakai bersama
├── docker-compose.yml         # Stack produksi
├── docker-compose.dev.yml     # Stack development (hot reload)
└── docker/                    # Dockerfile frontend & backend
```

## FAQ

**Apakah file project saya diupload ke server?**
Tidak. Folder project diakses langsung dari disk lewat File System Access API browser. Yang dikirim ke backend (lalu ke AI provider) hanya: teks chat yang kamu ketik, isi file yang sedang aktif di editor (kalau relevan dengan permintaanmu), dan struktur nama file/folder (untuk konteks). Isi file lain yang tidak sedang dibuka tidak ikut terkirim.

**Kenapa harus pakai Chrome atau Edge? Tidak bisa di Firefox?**
Fitur buka-folder-langsung memakai File System Access API, yang sampai saat ini hanya didukung browser berbasis Chromium (Chrome, Edge, Brave, Opera). Firefox dan Safari belum mengimplementasikan API ini. Sebagai alternatif, kamu bisa memakai mode **Open ZIP** yang bekerja di semua browser modern, dengan trade-off perubahan tidak tersimpan otomatis ke file aslinya.

**Saya sudah isi API key tapi AI tetap tidak merespons / selalu error "all providers failed".**
Cek beberapa hal: (1) pastikan file `.env`/`apps/api/.env` benar-benar terbaca — restart backend setelah mengubahnya; (2) cek log backend, biasanya ada keterangan provider mana yang gagal dan kenapa (kunci salah, kuota habis, dsb); (3) coba isi lebih dari satu provider supaya fallback chain punya cadangan.

**Apakah Puter AI masih didukung?**
Tidak. Integrasi Puter AI sudah dihapus sepenuhnya dari project ini (baik di frontend maupun backend) karena Puter tidak menyediakan REST API server-side yang stabil untuk kebutuhan ini. Pilihan `id: 'puter'` yang mungkin tersisa di state lama browser akan otomatis dialihkan ke mode Auto.

**Apa beda mode Gateway dan mode OpenCode?**
Gateway memproses instruksimu dalam satu kali panggilan ke AI provider dan menampilkan hasilnya sebagai teks/kode untuk kamu terapkan. OpenCode menjalankan binary `opencode` sebagai proses terpisah yang bisa melakukan beberapa langkah secara mandiri (membaca beberapa file, menjalankan command, memverifikasi hasil) sebelum memberi jawaban akhir — lebih cocok untuk tugas multi-langkah, tapi butuh instalasi tambahan (`npm install -g opencode-ai`) dan umumnya lebih lambat dibanding satu panggilan Gateway biasa.

**Apa beda Auto-Apply dan diff viewer manual?**
Diff viewer (mode default) menampilkan perbandingan kode lama vs baru dan menunggu kamu klik Apply secara sadar — lebih aman untuk perubahan besar atau project produksi. Auto-Apply langsung menyimpan perubahan ke file begitu AI selesai merespons, tanpa langkah konfirmasi — lebih cepat untuk iterasi tapi berisiko kalau hasil AI tidak sesuai harapan. Kamu bisa beralih antara keduanya kapan saja lewat toggle di header.

**Apakah Prompt Optimizer membuat AI lebih lambat?**
Ya, sedikit — karena ada dua panggilan AI tambahan sebelum permintaanmu diproses oleh model utama. Untuk permintaan sederhana yang sudah jelas, lebih baik nonaktifkan fitur ini. Untuk permintaan yang kompleks, ambigu, atau melibatkan banyak file/komponen, tambahan waktu ini biasanya terbayar dengan hasil yang lebih tepat sasaran di percobaan pertama.

**Kenapa AI saya hanya membuat 1 file padahal saya minta 3 file (HTML+CSS+JS)?**
Ini terjadi kalau AI menulis label file dalam format yang tidak standar (misalnya heading `### HTML` saja, tanpa nama file). CodeFlow AI mendeteksi file dari label seperti `**style.css**` tepat sebelum blok kode. Kalau kamu menemukan kasus ini, coba minta ulang dengan instruksi lebih eksplisit, misalnya "buatkan 3 file: index.html, style.css, script.js, beri label nama file sebelum tiap kode".

**Apakah saya butuh database (PostgreSQL/Redis) untuk menjalankan ini?**
Tidak. Semua state runtime (status kesehatan provider, rate limit, sesi preview) disimpan di memory backend. Ini pilihan desain yang disengaja agar stack tetap ringan — konsekuensinya, status tersebut akan reset setiap kali backend di-restart, dan ini tidak masalah karena sifatnya memang sementara.

**Saya jalankan lewat Docker di server, tapi status selalu "Offline Mode" dan terminal gagal connect terus.**
Kemungkinan besar `NEXT_PUBLIC_API_URL` masih mengarah ke `localhost`. Variabel ini di-bake ke bundle JavaScript saat `docker build`, bukan dibaca saat container berjalan — jadi mengubahnya di `.env` lalu sekadar `docker compose restart` tidak akan berpengaruh. Ubah ke alamat yang bisa dijangkau browser kamu (IP/hostname server), lalu jalankan `docker compose build --no-cache web && docker compose up -d`.

**Bisakah saya menjalankan model AI sepenuhnya lokal, tanpa API key apapun?**
Bisa, lewat Ollama. Install Ollama di komputer/server, jalankan model yang diinginkan (`ollama pull llama3.2`), lalu pilih provider **Ollama (Local)** di CodeFlow AI. Tidak ada data yang keluar ke internet untuk percakapan AI saat memakai jalur ini — namun fitur web browsing (Tavily/Firecrawl) tetap butuh koneksi internet kalau diaktifkan secara terpisah.

**Apa yang terjadi kalau saya menutup tab browser saat AI sedang menulis kode?**
Permintaan ke backend akan dibatalkan (koneksi SSE terputus), dan backend menghentikan pemrosesan yang sedang berjalan. Tidak ada perubahan file yang tersimpan dari respons yang belum selesai dikirim.

**Apakah saya bisa pakai banyak provider AI sekaligus dalam satu waktu?**
Untuk satu permintaan, hanya satu provider yang benar-benar memproses — tapi kamu bisa mengisi banyak API key sekaligus di `.env`, dan sistem fallback otomatis akan mencoba provider berikutnya kalau yang pertama gagal, tanpa kamu perlu memilih ulang secara manual.

---

Dibuat dan didokumentasikan secara bertahap mengikuti riwayat pengembangan CodeFlow AI, dari scaffold awal hingga integrasi Terminal, Preview, OpenCode, Prompt Optimizer, dan Docker stack.