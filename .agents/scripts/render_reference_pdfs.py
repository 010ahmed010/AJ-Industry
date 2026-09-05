from pathlib import Path

import fitz


SOURCE_DIR = Path("Description-Mirror-Method/attached-files")
OUTPUT_DIR = Path(".agents/outputs/reference-pdfs")


def render_pdf(pdf_path: Path) -> None:
    output_dir = OUTPUT_DIR / pdf_path.stem.replace("[", "_").replace("]", "_")
    output_dir.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf_path)
    print(f"{pdf_path}: {len(document)} pages")
    for index, page in enumerate(document):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        output_path = output_dir / f"page-{index + 1:02d}.png"
        pixmap.save(output_path)
        print(f"  {output_path} {page.rect.width:.0f}x{page.rect.height:.0f}")


def main() -> None:
    for pdf_path in sorted(SOURCE_DIR.rglob("*.pdf")):
        render_pdf(pdf_path)


if __name__ == "__main__":
    main()