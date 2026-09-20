"""
Documentation & Reality Guard Tests (Static Assertions)
Lisans: UNLICENSED

Bu test paketi, Faz 3 kuralları gereğince depodaki kod ve dokümanların
gerçeklik standartlarına uyumunu doğrular:
1. Desteklenmeyen Togg API/donanım iddialarının (TruCar, CAN-bus, REST telemetry gateway) bulunmadığı.
2. ALO 182'nin kriz bağlamında hiçbir kod veya dokümanda yer almadığı.
3. package.json lisansının UNLICENSED olduğu.
4. Vision modülünde sentetik 52 + (intervalCount % 5) döngüsünün kalmadığı.
"""

import os
from pathlib import Path
import json

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

def test_no_unsupported_togg_terms_in_repo():
    """TruCar, CAN-bus, REST telemetry gateway gibi doğrulanmamış Togg terimleri depoda bulunmamalıdır."""
    unsupported_patterns = [
        "trucar",
        "can-bus",
        "can bus",
        "rest telemetry gateway",
        "oem android automotive"
    ]
    
    # Taranacak uzantılar
    scan_extensions = [".md", ".ts", ".tsx", ".py", ".json"]
    # Hariç tutulacak klasörler
    exclude_dirs = {".git", "node_modules", ".venv", "__pycache__", ".next", ".system_generated"}

    violations = []

    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            p = Path(root) / file
            if p.resolve() == Path(__file__).resolve():
                continue
            if p.suffix.lower() in scan_extensions:
                try:
                    content = p.read_text(encoding="utf-8", errors="ignore").lower()
                    for pattern in unsupported_patterns:
                        if pattern in content:
                            violations.append(f"{p.relative_to(ROOT_DIR)}: '{pattern}' bulundu")
                except Exception:
                    pass

    assert len(violations) == 0, f"Desteklenmeyen terim ihlalleri tespit edildi:\n" + "\n".join(violations)

def test_package_json_license_is_unlicensed():
    """Kendi kodumuzun lisansı package.json içinde UNLICENSED olmalıdır."""
    pkg_path = ROOT_DIR / "package.json"
    assert pkg_path.exists(), "package.json bulunamadı"
    
    with open(pkg_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data.get("license") == "UNLICENSED", f"Beklenen UNLICENSED, ancak {data.get('license')} bulundu."

def test_no_182_in_crisis_contexts():
    """Kriz tespit ve müdahale dosyalarında 182 numarası kesinlikle yer alamaz."""
    crisis_files = [
        ROOT_DIR / "services" / "core-api" / "mental_provider.py",
        ROOT_DIR / "packages" / "safety" / "crisisDetector.ts",
        ROOT_DIR / "SAFETY.md",
        ROOT_DIR / "docs" / "clinical-safety" / "clinical_evaluation_protocol.md"
    ]

    for cf in crisis_files:
        if cf.exists():
            content = cf.read_text(encoding="utf-8")
            assert "182" not in content, f"{cf.name} içinde 182 bulundu! Krizde yalnızca 112 kullanılmalıdır."

def test_no_synthetic_distance_generator_in_vision():
    """Vision modülünde 'intervalCount % 5' benzeri sahte mesafe döngüsü bulunmamalıdır."""
    vision_page = ROOT_DIR / "apps" / "vehicle-app" / "src" / "app" / "vision" / "page.tsx"
    assert vision_page.exists()
    content = vision_page.read_text(encoding="utf-8")
    assert "intervalCount % 5" not in content, "Sahte mesafe hesabı 'intervalCount % 5' tespit edildi!"
    assert "Doğrulanan" in content or "verifiedDistanceCm" in content, "Kullanıcı doğrulamalı mesafe mantığı bulunamadı."
