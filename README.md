# ZeN KataGo Bridge

ตัวเชื่อมที่ทำให้เว็บ **[ZeN-GoSensei](https://zen-gosensei.vercel.app)** ใช้ KataGo บนเครื่องของคุณเองได้
(วิเคราะห์ตา, เล่นกับเครื่อง, ประเมินคิวจากเกมจริง) — ไม่ต้องมีซอร์สโค้ดของแอป ไม่ต้องตั้งไฟล์ `.env`

repo นี้มี **ไฟล์เดียว** ที่ต้องใช้: `zen-katago-bridge.mjs` ไม่มีไลบรารีภายนอก ไม่ได้ย่อโค้ด เปิดอ่านได้ทั้งไฟล์

คู่มือฉบับเต็มพร้อมรูป: https://zen-gosensei.vercel.app/guide#integrate-katago

## สิ่งที่ต้องมี

1. **Node.js 20 ขึ้นไป** — https://nodejs.org (เลือกรุ่น LTS)
2. **KataGo** — https://github.com/lightvector/KataGo/releases
   - การ์ดจอ NVIDIA → รุ่น `cuda` หรือ `trt`
   - การ์ดจอ AMD/Intel → รุ่น `opencl` (v1.18.1 เป็นรุ่นล่าสุดที่ยังมี)
   - ไม่มีการ์ดจอ → รุ่น `eigen` (v1.18.1) กับโครงข่ายตัวเล็ก
3. **ไฟล์โครงข่าย** (`.bin.gz`) — https://katagotraining.org/networks/
   - ไม่บังคับ: โมเดลเลียนแบบคน `b18c384nbt-humanv0.bin.gz` (หน้า release v1.15.0) สำหรับประเมินคิวจากเกมจริง

## ติดตั้ง (ครั้งเดียว)

ดาวน์โหลด `zen-katago-bridge.mjs` จากหน้า Releases แล้วสั่งในโฟลเดอร์ที่วางไฟล์ไว้:

```sh
node zen-katago-bridge.mjs setup --katago "<ที่อยู่โปรแกรม katago>" --model "<ที่อยู่ไฟล์ .bin.gz>"
```

ตัวอย่าง Windows: `--katago "C:\katago\katago.exe" --model "C:\katago\kata1-b18c384nbt.bin.gz"`
ตัวอย่าง macOS/Linux: `--katago ~/katago/katago --model ~/katago/kata1-b18c384nbt.bin.gz`

ตัวเลือกเพิ่ม: `--config <analysis.cfg>` (ปกติใช้ `analysis_example.cfg` ที่อยู่ข้างโปรแกรมให้เอง) ·
`--human-model <ไฟล์>` · `--port <เลข>` (ค่าเริ่มต้น 41950)

## ใช้งาน

```sh
node zen-katago-bridge.mjs
```

หน้าต่างจะแสดง **รหัสจับคู่** → เปิดเว็บ หน้า **การตั้งค่า AI และ KataGo → แท็บ KataGo** → วางรหัส → กด **จับคู่**
เปิดหน้าต่างตัวเชื่อมค้างไว้ระหว่างใช้เว็บ ปิดหน้าต่าง = ปิดตัวเชื่อม

| คำสั่ง | ทำอะไร |
|---|---|
| `node zen-katago-bridge.mjs check` | ตรวจว่าตั้งค่าครบไหม |
| `node zen-katago-bridge.mjs token` | แสดงรหัสจับคู่ |
| `node zen-katago-bridge.mjs token --new` | สุ่มรหัสใหม่ (รหัสเก่าใช้ไม่ได้ทันที) |

## ความปลอดภัย — ตัวเชื่อมทำอะไร และไม่ทำอะไร

- ฟังเฉพาะ `127.0.0.1` — เครื่องอื่นในเครือข่ายต่อไม่ได้
- รับคำขอจาก `https://zen-gosensei.vercel.app` (และ `http://localhost` ตอนพัฒนา) เท่านั้น และทุกคำขอต้องมีรหัสจับคู่
- ตรวจ `Host` กันการโจมตีแบบ DNS rebinding
- มีแค่ 4 คำสั่ง: วิเคราะห์ตำแหน่ง, ให้เครื่องเดิน, สถานะ/หยุดเครื่อง, ประเมินคิว — **เว็บสั่งให้รันโปรแกรมอื่นหรืออ่านไฟล์ไม่ได้**
- ที่อยู่ไฟล์ KataGo ตั้งได้จากคำสั่ง `setup` บนเครื่องคุณเท่านั้น
- ไม่ส่งข้อมูลออกนอกเครื่อง ไม่มีการเก็บสถิติ
- ไฟล์ตั้งค่า (มีรหัสจับคู่): Windows `%APPDATA%\zen-katago-bridge\config.json` ·
  macOS `~/Library/Application Support/zen-katago-bridge/config.json` · Linux `~/.config/zen-katago-bridge/config.json`

## ปัญหาที่พบบ่อย

- **Chrome ถาม "อนุญาตให้เว็บเข้าถึงอุปกรณ์ในเครือข่ายของคุณ"** → กดอนุญาต (เว็บคุยกับตัวเชื่อมบนเครื่องคุณ)
- **Safari** อาจไม่ยอมให้เว็บ https คุยกับ `http://127.0.0.1` — ใช้ Chrome, Edge หรือ Firefox
- **"พอร์ตถูกใช้อยู่"** → ตัวเชื่อมเปิดค้างอยู่แล้ว หรือเปลี่ยนพอร์ตด้วย `setup --port 41960` แล้วแก้ที่อยู่ในเว็บให้ตรง
- **"รหัสจับคู่ไม่ถูกต้อง"** → `node zen-katago-bridge.mjs token` แล้วคัดลอกใหม่
- **KataGo ยังไม่พร้อม** → `node zen-katago-bridge.mjs check` จะบอกว่าไฟล์ไหนหาย

---

### English (short)

A tiny local server that lets the hosted ZeN-GoSensei web app use **your own KataGo**.
Requires Node.js 20+. Run `node zen-katago-bridge.mjs setup --katago <katago binary> --model <network .bin.gz>`, then
`node zen-katago-bridge.mjs` and paste the pairing code into the site's *การตั้งค่า AI และ KataGo → แท็บ KataGo* page.
It binds to 127.0.0.1 only, accepts only the app's origin plus a pairing token, checks `Host` against DNS rebinding,
and exposes only four engine endpoints. It never runs other programs or reads other files.

---

## สัญญาอนุญาต (License)

**Source-available — ไม่ใช่โอเพนซอร์ส** ดู [LICENSE](LICENSE)
ดาวน์โหลด อ่านตรวจ และรันแบบไม่แก้ไข เพื่อต่อเว็บ ZeN-GoSensei กับ KataGo บนเครื่องตัวเองได้ฟรี ·
ห้ามคัดลอก ดัดแปลง นำส่วนใดไปใช้ในซอฟต์แวร์อื่น หรือแจกต่อ โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร ·
KataGo ไม่ได้รวมอยู่ใน repo นี้ (ดาวน์โหลดแยกภายใต้ MIT License ของ KataGo)

Free to download, read, audit and run unmodified to connect ZeN-GoSensei to your own KataGo.
Copying, modifying, reusing any part in other software, or redistributing requires written permission.
