"""
OCR Service for extracting text from Nakal documents.
Uses Tesseract with Hindi and English language support.
"""
import re
import io
from typing import Optional, Dict, List, Any

try:
    import pytesseract
    from PIL import Image
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

try:
    from pdf2image import convert_from_bytes
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False


class OCRService:
    """
    OCR service for processing Nakal documents.
    Extracts structured land record data from scanned documents.
    """
    
    # Common patterns in Hindi land records
    PATTERNS = {
        'plot_id': [
            r'खसरा\s*(?:न|नं|संख्या)[\s.:]*([०-९\d/\-]+)',
            r'Khasra\s*(?:No|Number)?[\s.:]*([0-9/\-]+)',
            r'प्लॉट\s*(?:न|नं)[\s.:]*([०-९\d/\-]+)',
            r'Plot\s*(?:No|ID)?[\s.:]*([0-9/\-]+)',
        ],
        'owner_name_hindi': [
            r'(?:स्वामी|मालिक|नाम)[\s.:]+([^\n,।]+)',
            r'Owner[\s.:]+(.+?)(?:\n|$)',
        ],
        'father_name_hindi': [
            r'(?:पिता|वालिद)[\s.:]+([^\n,।]+)',
            r'(?:S/O|D/O|W/O)[\s.:]*(.+?)(?:\n|$)',
        ],
        'area': [
            r'(?:क्षेत्रफल|रकबा|एरिया)[\s.:]+([०-९\d\s\-\.]+(?:बीघा|बिस्वा|हेक्टेयर|वर्ग मीटर|sq\.?\s*m)?)',
            r'Area[\s.:]+([0-9\.\-\s]+(?:Bigha|Biswa|Hectare|sq\.?\s*m)?)',
        ],
        'khata_number': [
            r'खाता[\s.:]+([०-९\d/\-]+)',
            r'Khata[\s.:]*([0-9/\-]+)',
        ],
        'khatauni_number': [
            r'खतौनी[\s.:]+([०-९\d/\-]+)',
            r'Khatauni[\s.:]*([0-9/\-]+)',
        ],
    }
    
    # Hindi to Arabic numeral mapping
    HINDI_NUMERALS = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
    
    def __init__(self, tesseract_cmd: Optional[str] = None):
        """
        Initialize OCR service.
        
        Args:
            tesseract_cmd: Path to tesseract executable (optional)
        """
        if tesseract_cmd and HAS_TESSERACT:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    
    def _convert_hindi_numerals(self, text: str) -> str:
        """Convert Hindi numerals to Arabic numerals."""
        for hindi, arabic in self.HINDI_NUMERALS.items():
            text = text.replace(hindi, arabic)
        return text
    
    def _extract_field(self, text: str, patterns: List[str]) -> Optional[str]:
        """Extract a field value using list of regex patterns."""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                value = match.group(1).strip()
                return self._convert_hindi_numerals(value)
        return None
    
    def _parse_area_to_sqm(self, area_text: Optional[str]) -> Optional[float]:
        """
        Parse area text to square meters.
        
        Common units:
        - 1 Bigha = ~2500 sqm (varies by state)
        - 1 Biswa = ~125 sqm (1/20 of Bigha)
        - 1 Hectare = 10000 sqm
        """
        if not area_text:
            return None
        
        area_text = area_text.lower()
        
        try:
            # Direct sqm
            if 'sq' in area_text or 'वर्ग' in area_text:
                num = re.search(r'([0-9.]+)', area_text)
                if num:
                    return float(num.group(1))
            
            # Hectare
            if 'hectare' in area_text or 'हेक्टेयर' in area_text:
                num = re.search(r'([0-9.]+)', area_text)
                if num:
                    return float(num.group(1)) * 10000
            
            # Bigha/Biswa
            bigha = 0
            biswa = 0
            
            bigha_match = re.search(r'([0-9.]+)\s*(?:bigha|बीघा)', area_text)
            if bigha_match:
                bigha = float(bigha_match.group(1))
            
            biswa_match = re.search(r'([0-9.]+)\s*(?:biswa|बिस्वा)', area_text)
            if biswa_match:
                biswa = float(biswa_match.group(1))
            
            if bigha or biswa:
                # Rajasthan: 1 Bigha = 2500 sqm, 1 Biswa = 125 sqm
                return (bigha * 2500) + (biswa * 125)
            
            # Try to parse as plain number
            num = re.search(r'([0-9.]+)', area_text)
            if num:
                return float(num.group(1))
                
        except (ValueError, AttributeError):
            pass
        
        return None
    
    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Extract text from an image using Tesseract OCR.
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Extracted text
        """
        if not HAS_TESSERACT:
            raise RuntimeError("pytesseract is not installed")
        
        image = Image.open(io.BytesIO(image_bytes))
        
        # Preprocess image for better OCR
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # OCR with Hindi and English
        text = pytesseract.image_to_string(
            image,
            lang='hin+eng',
            config='--psm 6'  # Assume uniform block of text
        )
        
        return text
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """
        Extract text from a PDF using OCR on each page.
        
        Args:
            pdf_bytes: Raw PDF bytes
            
        Returns:
            Combined extracted text from all pages
        """
        if not HAS_PDF2IMAGE:
            raise RuntimeError("pdf2image is not installed")
        if not HAS_TESSERACT:
            raise RuntimeError("pytesseract is not installed")
        
        # Convert PDF pages to images
        images = convert_from_bytes(pdf_bytes, dpi=300)
        
        all_text = []
        for i, image in enumerate(images):
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            text = pytesseract.image_to_string(
                image,
                lang='hin+eng',
                config='--psm 6'
            )
            all_text.append(f"--- Page {i+1} ---\n{text}")
        
        return '\n'.join(all_text)
    
    def parse_nakal_text(self, text: str, source_file: str = None) -> Dict[str, Any]:
        """
        Parse extracted text into structured land record data.
        
        Args:
            text: OCR-extracted text
            source_file: Source filename for reference
            
        Returns:
            Parsed land record data
        """
        record = {
            'plot_id': self._extract_field(text, self.PATTERNS['plot_id']),
            'owner_name_hindi': self._extract_field(text, self.PATTERNS['owner_name_hindi']),
            'father_name_hindi': self._extract_field(text, self.PATTERNS['father_name_hindi']),
            'recorded_area_text': self._extract_field(text, self.PATTERNS['area']),
            'khata_number': self._extract_field(text, self.PATTERNS['khata_number']),
            'khatauni_number': self._extract_field(text, self.PATTERNS['khatauni_number']),
            'source_document': source_file,
            'raw_text': text[:2000],  # Store first 2000 chars for reference
        }
        
        # Parse area to sqm
        record['recorded_area_sqm'] = self._parse_area_to_sqm(record.get('recorded_area_text'))
        
        return record
    
    def process_nakal(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Process a Nakal document (image or PDF) and extract land record data.
        
        Args:
            file_bytes: Raw file bytes
            filename: Original filename
            
        Returns:
            Extracted and parsed land record data
        """
        filename_lower = filename.lower()
        
        # Extract text based on file type
        if filename_lower.endswith('.pdf'):
            text = self.extract_text_from_pdf(file_bytes)
        elif filename_lower.endswith(('.jpg', '.jpeg', '.png')):
            text = self.extract_text_from_image(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {filename}")
        
        # Parse extracted text
        record = self.parse_nakal_text(text, filename)
        
        return record
