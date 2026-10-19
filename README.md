# Nha DX Dubber Pro - Web App 🎬🇰🇭
> កម្មវិធី **Transcribe & Dubbing វីដេអូជាភាសាខ្មែរ (Web App)** ដំណើរការលើ Web Browser (កុំព្យូទ័រ, Tablet, ទូរស័ព្ទ) ដោយប្រើប្រាស់ **Google Gemini API** និង **Microsoft Neural TTS Khmer Voices**។

---

## 🌟 មុខងារចម្បងៗ (Key Features)

### ១. ដាក់បញ្ចូល Video ម្តង១ ឬម្តងច្រើន (Single & Batch Upload)
- គាំទ្រការអូសទម្លាក់ (Drag & Drop) ឬចុចជ្រើសរើស Video ពីកុំព្យូទ័រ, Tablet ឬទូរស័ព្ទ
- គាំទ្រទម្រង់វីដេអូពេញនិយម៖ `.mp4`, `.mov`, `.mkv`, `.webm`, `.avi`
- បង្ហាញបញ្ជី Video Queue រួមមាន Thumbnail, រយៈពេល, ទំហំ និងស្ថានភាពនីមួយៗ
- មានប៊ូតុង **"ដំណើរការទាំងអស់ (Process All)"** សម្រាប់ធ្វើការងារលើវីដេអូជាច្រើនក្នុងពេលតែមួយដោយស្វ័យប្រវត្តិ

### ២. Transcribe ជាភាសាខ្មែរដោយ Gemini API
- ទាញយកសំឡេងពី Video រួចបញ្ជូនទៅកាន់ Google Gemini API
- ម៉ូឌែលដែលគាំទ្រ៖
  - `gemini-3.8-flash` (ជំនាន់ចុងក្រោយ - លឿន & ឆ្លាតវៃបំផុត)
  - `gemini-3.8-pro`
  - `gemini-2.5-flash` (លឿន & បកប្រែខ្មែរបានច្បាស់ល្អ)
  - `gemini-2.5-pro`
- បង្កើត Subtitles ភាសាខ្មែរដោយស្វ័យប្រវត្តិតាមពេលវេលាជាក់ស្តែង (Timestamps)
- អាចកែសម្រួលពាក្យពេចន៍ខ្មែរ, ផ្លាស់ប្តូរពេលវេលា, លុប ឬបន្ថែមចំណុចថ្មីៗបានយ៉ាងងាយស្រួល

### ៣. Dubbing សំឡេងខ្មែរដោយ Microsoft Neural TTS
- ប្រើប្រាស់សំឡេង Neural Khmer របស់ Microsoft៖
  - 👨 **Piseth Neural** (`km-KH-PisethNeural` - សំឡេងប្រុស)
  - 👩 **Sreymom Neural** (`km-KH-SreymomNeural` - សំឡេងស្រី)
- កែសម្រួលល្បឿននិយាយ (Rate), កម្រិតសំឡេងដើម (BGM Volume), និងកម្រិតសំឡេង Dubbing
- អាចចុចស្តាប់សំឡេងបកប្រែជាមុន (Preview) ម្តងមួយចំណុច ឬទាំងអស់បាន

### ៤. Export & Merge Video
- រួមបញ្ចូលគ្នារវាង Video ដើម + សំឡេង Dubbing ខ្មែរ + សំឡេង Background Music
- ជម្រើសដុតអក្សររត់ខ្មែរជាប់លើផ្ទៃ Video (Burn-in Khmer Subtitles)
- មុខងារ **Merge Video**: ផ្គុំវីដេអូទាំងអស់ក្នុង Queue បញ្ចូលគ្នាទៅជា File តែមួយ
- ដំណើរការ Export លើ Web Browser ផ្ទាល់ (Client-side Rendering) មិនបាច់រង់ចាំ Server យូរ

---

## 💻 របៀបដំណើរការលើម៉ាស៊ីនផ្ទាល់ (Local Development)

### ១. តម្លើង Dependencies
```bash
npm install
```

### ២. ដំណើរការជា Development Mode (Vite Dev Server)
```bash
npm run dev
```
បើក Browser: `http://localhost:5173`

### ៣. Build និងដំណើរការ Production Web Server
```bash
npm run build
npm start
```
បើក Browser: `http://localhost:3000`

---

## 🚀 របៀប Hosting Server លើ Render (onrender.com)

Render.com គឺជា Cloud Hosting ដ៏ល្អបំផុតសម្រាប់ Node.js Web Apps ដោយមាន Free Tier និងគាំទ្រ SSL (HTTPS) ស្វ័យប្រវត្តិ។

### វិធីទី១៖ ដាក់ពង្រាយតាមរយៈ GitHub (ងាយស្រួលបំផុត & ណែនាំ)

1. **Upload កូដនេះទៅកាន់ GitHub Repository របស់អ្នក៖**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Nha DX Dubber Pro Web App"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. **ចូលទៅកាន់ Render.com៖**
   - បង្កើតគណនី ឬ Login នៅ [https://render.com](https://render.com)
   - ចុចប៊ូតុង **"New +"** នៅខាងស្តាំខាងលើ រួចជ្រើសរើស **"Web Service"**

3. **ភ្ជាប់ទៅកាន់ GitHub Repository៖**
   - ជ្រើសរើស Repo `nha-dx-dubber-pro-web` ដែលអ្នកទើបតែ Push
   - ចុច **"Connect"**

4. **កំណត់ Settings លើ Render៖**
   - **Name**: `nha-dx-dubber-pro` (ឬឈ្មោះតាមចិត្ត)
   - **Region**: `Singapore` (សម្រាប់អ្នកនៅកម្ពុជា/អាស៊ី គឺលឿនបំផុត)
   - **Branch**: `main`
   - **Root Directory**: ទុកទំនេរ (Default)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. **(ជម្រើសបន្ថែម) បន្ថែម Environment Variables (Optional):**
   - `PORT`: `10000` (Render នឹងកំណត់ស្វ័យប្រវត្តិ)
   - `AZURE_SPEECH_KEY`: បើអ្នកមាន Azure Speech Key អាចដាក់ទីនេះបាន
   - `AZURE_SPEECH_REGION`: `eastus`

6. **ចុច "Deploy Web Service"៖**
   - Render នឹងចាប់ផ្តើម Install dependencies, Build Vite frontend និងបើក Server
   - បន្ទាប់ពី Build ចប់ អ្នកនឹងទទួលបាន Link គេហទំព័រផ្ទាល់ខ្លួន ឧទាហរណ៍៖  
     👉 **`https://nha-dx-dubber-pro.onrender.com`**

---

### វិធីទី២៖ ប្រើប្រាស់ Render Blueprint (`render.yaml`)

នៅក្នុង Project នេះមាន File `render.yaml` រួចជាស្រេច៖
1. នៅលើ Render Dashboard ចុច **"New +"** -> **"Blueprint"**
2. ជ្រើសរើស GitHub Repo របស់អ្នក
3. Render នឹងអានការកំណត់ពី `render.yaml` ដោយស្វ័យប្រវត្តិតែម្ដង រួចចុច **"Apply"**!

---

## 🔑 របៀបយក Google Gemini API Key (ឥតគិតថ្លៃ)
1. ចូលទៅកាន់គេហទំព័រ [Google AI Studio](https://aistudio.google.com/app/apikey)
2. ចុចប៊ូតុង **"Create API Key"**
3. ចម្លង Key យកមកបិទភ្ជាប់ក្នុងប្រអប់ **ការកំណត់ (Settings)** នៃ Web App
4. ចុចប៊ូតុង **"រក្សាទុកការកំណត់"** ជាការស្រេច!
