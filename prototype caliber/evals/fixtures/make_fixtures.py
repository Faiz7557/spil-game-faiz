"""Builds the four synthetic evidence documents for evals/evidence-check.eval.ts.

Every page is stamped SYNTHETIC TEST DOCUMENT. They exist only to test the evidence reader and must
never be presented as real plant records. Run from the repo root:
    .venv/Scripts/python prototype/evals/fixtures/make_fixtures.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
W, H = 1240, 1754  # A4 at 150 dpi


def font(size):
    for name in ("arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def page(title, rows, footer):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([60, 60, W - 60, 150], outline="black", width=3)
    d.text((80, 80), "PT CONTOH PETROKIMIA (FICTIONAL) - MAINTENANCE RECORD", fill="black", font=font(30))
    d.text((80, 170), title, fill="black", font=font(44))
    y = 270
    for k, v in rows:
        d.text((80, y), f"{k}:", fill="black", font=font(30))
        d.text((480, y), v, fill="black", font=font(30))
        y += 64
    d.text((80, y + 40), footer, fill="black", font=font(26))
    stamp = Image.new("RGBA", (1500, 140), (0, 0, 0, 0))
    ImageDraw.Draw(stamp).text((10, 20), "SYNTHETIC TEST DOCUMENT", fill=(190, 30, 30, 200), font=font(72))
    rot = stamp.rotate(18, expand=True)
    img.paste(rot, (20, 1000), rot)
    return img


def main():
    page("Repair record: lube-oil cooler tube plug and pressure re-test", [
        ("Equipment tag", "KO-3201"), ("Work order", "WO-TEST-0001"), ("Date", "30-Apr-2026"),
        ("Work done", "Leaking cooler tube plugged; hydro re-test passed"), ("Performed by", "Mechanical crew A"),
        ("Signed", "M. Planner (signature on file)")], "Scope: cooler repair only.").save(HERE / "cooler-repair-record.pdf")
    page("Commissioning record: online water-in-oil sensor", [
        ("Equipment tag", "KO-3201"), ("Instrument", "Water-in-oil sensor WIO-TEST-01"), ("Date", "12-Oct-2026"),
        ("Installation", "Installed on lube-oil return line, loop checked"), ("Commissioned by", "Instrument technician B"),
        ("Signed", "I. Engineer (signature on file)")], "Sensor online and reading in DCS.").save(HERE / "sensor-commissioning-record.pdf")
    page("Signal validation: sensor reading vs lab sample", [
        ("Equipment tag", "KO-3202"), ("Instrument", "Water-in-oil sensor WIO-TEST-02"), ("Date", "14-Oct-2026"),
        ("Sensor reading", "410 ppm"), ("Lab sample", "425 ppm (within tolerance)"),
        ("Signed", "Lab analyst C (signature on file)")], "Validation of the KO-3202 sensor.").save(HERE / "signal-validation-ko3202.pdf")
    page("DCS alarm configuration", [
        ("Equipment tag", "KO-3201"), ("Point", "KO3201_WIO high alarm"), ("Setpoint", "500 ppm"),
        ("Priority", "High"), ("Configured by", "DCS engineer D")], "No date recorded on this screen print.").save(HERE / "undated-alarm-config.png")
    print("wrote 4 fixtures to", HERE)


if __name__ == "__main__":
    main()
