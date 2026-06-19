# Rover-01 Candidate Hardware

เอกสารนี้คือโปรไฟล์ฮาร์ดแวร์ที่ “น่าจะใช่” จากรูปที่ส่งมา ไม่ใช่การล็อก
hardware ถาวรของ RoboForge ถ้าของจริงต่างจากนี้ ให้เก็บข้อมูลจริงใน
`/admin` Hardware Profile แล้วให้ firmware ยังพูด `docs/ROBOT_PROTOCOL.md`
เหมือนเดิม

## สรุปแบบไม่ใช้ศัพท์ยาก

ตัวต้นแบบที่ควรเตรียมรองรับก่อนคือ:

- บอร์ด: ESP32 DevKit V1 หรือบอร์ด ESP32-WROOM-32 ใกล้เคียง
- ตัวขับมอเตอร์: L298N dual H-bridge
- มอเตอร์: TT DC gear motors พร้อมล้อยาง
- แบตเตอรี่: 18650 Li-ion 2 ก้อนแบบ 2S
- รูปแบบขับเคลื่อน: differential drive แยกซ้าย/ขวา

แปลเป็นภาษาง่าย ๆ: มือถือหรือคอมจะต่อ Wi-Fi ของ ESP32 แล้วเปิดหน้า
Cockpit ในตัวหุ่น คำสั่ง joystick วิ่งในวง Wi-Fi ของหุ่น ส่วน Supabase เก็บ
บัญชี เจ้าของ claim code ผลทดสอบ และสรุปว่าต่อสำเร็จหรือพังตรงไหน

## สิ่งที่ทำได้เลยในซอฟต์แวร์

- ใช้ firmware ปัจจุบันต่อได้ เพราะมี ESP32 access point, local API,
  LittleFS web app, PWM motor output, battery gate, arm/stop/deadman safety
- ไม่ต้องเพิ่ม motor library สำหรับ L298N ใช้ GPIO กับ PWM ตรงพอ
- ใน `/admin` ให้ใช้ candidate preset เพื่อกรอก ESP32 + L298N + 2S Li-ion
  ได้เร็วขึ้น แต่ยังต้องเช็ค switch, fuse/protected pack, BMS, และ motor
  polarity จากของจริง
- Supabase ไม่ควรเก็บ joystick สด ให้เก็บ connection/control summary และ
  bench evidence เท่านั้น

## Reality check ปี 2026

- จากรูป ชุดนี้ดูเหมาะกับ MVP มากกว่า production hardware ระยะยาว
- ESP32-WROOM-32 ใช้ทดสอบได้ แต่ datasheet ของ Espressif ทำเครื่องหมายว่า
  not recommended for new designs แล้ว ถ้าจะซื้อเพิ่มจำนวนมากให้เช็กรุ่นบน
  module จริงก่อน แล้วค่อยเลือกบอร์ดที่ยัง active สำหรับ batch ถัดไป
- L298N ใช้งานง่ายและตรงกับรูป แต่ถ้ารถหนักขึ้นหรือมอเตอร์กินกระแสสูง อาจ
  ต้องเปลี่ยน driver ภายหลัง ดังนั้นให้ล็อกที่ `docs/ROBOT_PROTOCOL.md`
  ไม่ใช่ล็อกชีวิตไว้กับ L298N
- 18650 แบบ 2 ก้อนต้องถือเป็นเรื่อง safety ไม่ใช่แค่เรื่องพลังงาน ต้องมี
  protected pack/BMS, switch, fuse หรือวิธีตัดไฟที่ตรวจได้จริง

สรุป: เตรียม library เพิ่มยังไม่จำเป็นสำหรับ L298N ตอนนี้ สิ่งที่จำเป็นกว่า
คือ protocol, safety gate, test evidence, และหน้ากรอก hardware profile ที่
เปลี่ยนรุ่นบอร์ดได้ภายหลัง

## Wiring ที่ firmware ตอนนี้คาดไว้

| หน้าที่ | ขา ESP32 | หมายเหตุ |
|---|---:|---|
| ENA / left PWM | GPIO25 | ถอด jumper ENA บน L298N เพื่อใช้ PWM |
| IN1 | GPIO26 | ทิศทางมอเตอร์ซ้าย |
| IN2 | GPIO27 | ทิศทางมอเตอร์ซ้าย |
| ENB / right PWM | GPIO33 | ถอด jumper ENB บน L298N เพื่อใช้ PWM |
| IN3 | GPIO32 | ทิศทางมอเตอร์ขวา |
| IN4 | GPIO14 | ทิศทางมอเตอร์ขวา |
| Battery ADC | GPIO34 | วัดแบตผ่านตัวแบ่งแรงดัน 100k/33k และ capacitor 100 nF |

ถ้าเป็นรถ 4 ล้อที่มีมอเตอร์ 4 ตัว ให้รวมมอเตอร์ฝั่งซ้ายเป็น channel A และ
ฝั่งขวาเป็น channel B ก่อน ถ้าเป็น 2WD ให้ใช้ mapping เดิมได้ แต่ต้องยืนยันว่า
ล้อหมุนทิศถูกตอนยกรถขึ้นจากพื้น

## เรื่องแบตเตอรี่ที่ต้องระวัง

2 ก้อน 18650 แบบ 2S หมายถึง Li-ion nominal ประมาณ 7.4 V และเต็มที่ประมาณ
8.4 V firmware ปัจจุบันตั้ง `ROBOFORGE_BATTERY_CELLS 2` ไว้แล้ว และจะบล็อก
การ arm ถ้าแรงดันดูไม่สมเหตุสมผลกับจำนวนเซลล์

ห้ามเอาลงพื้นก่อนเช็คสิ่งนี้:

- มี BMS หรือ protected cells ที่เหมาะกับ 2S
- มี power switch ที่กดถึงง่าย
- มี fuse หรือ protected pack
- กล่องถ่านยึดแน่น ไม่หลุดตอนชน
- GND ของ ESP32 กับ L298N ต่อร่วมกัน
- ค่าแบตใน Cockpit ใกล้ multimeter ไม่เกินประมาณ 0.2 V

ถ้าตัวจริงไม่มี BMS/fuse/switch ให้ถือว่า `blocked` หรือ `needs_details` ใน
Hardware Profile ก่อน ไม่ใช่ `ready_for_floor`

## ข้อจำกัดของ L298N

L298N ใช้ได้สำหรับ MVP และรถทดลอง แต่ไม่ใช่ตัวขับมอเตอร์ที่มีประสิทธิภาพสูง
อาการที่อาจเจอคือมอเตอร์อืดหรือแรงตก เพราะตัวชิปมี voltage drop ตอนจ่ายกระแส
ถ้าทดสอบแล้วรถอ่อนเกินไป ค่อยพิจารณาเปลี่ยน driver ในรุ่นถัดไป เช่น
TB6612FNG สำหรับมอเตอร์เล็ก หรือ driver กระแสสูงกว่าสำหรับรถหนักขึ้น

## ข้อมูลที่ยังต้องถาม/ถ่ายรูปเมื่อของมาถึง

- ชื่อรุ่นบนบอร์ด ESP32 หรือรูปชัด ๆ ของ silkscreen
- จำนวนมอเตอร์จริง: 2 ตัวหรือ 4 ตัว
- วิธีต่อ L298N: jumper ENA/ENB ยังเสียบอยู่ไหม
- ถ่านเป็น protected cell หรือมี BMS แยกหรือไม่
- มี switch และ fuse จริงไหม
- รูปสายจาก ESP32 ไป L298N แบบเห็น pin ชัด
- วัดแรงดัน pack ตอนเต็มและตอนเริ่มทดสอบ

## แหล่งข้อมูลที่ใช้เช็ค

- Espressif ESP32-WROOM-32 datasheet:
  https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf
- Espressif ESP32 LEDC PWM documentation:
  https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/ledc.html
- STMicroelectronics L298 datasheet:
  https://www.st.com/resource/en/datasheet/l298.pdf
- Texas Instruments battery protection overview:
  https://www.ti.com/product-category/battery-management-ics/battery-protectors/overview.html
- Health Canada lithium-ion battery safety:
  https://www.canada.ca/en/health-canada/services/household-products/battery-safety/lithium-ion.html
