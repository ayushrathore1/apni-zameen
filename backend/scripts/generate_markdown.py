"""
Generate a Markdown file with all land owner data.
"""
import json
import os

def generate_markdown():
    # Load the generated GeoJSON
    geojson_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "generated", "bhinay_all_parcels.geojson")
    
    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Start building markdown content
    lines = []
    lines.append("# Land Owners Data - Bhinay Block, Ajmer")
    lines.append("")
    lines.append("**Generated:** 500 parcels across 5 villages")
    lines.append("")
    lines.append("## Quick Stats")
    
    # Count discrepancies
    total = len(data['features'])
    discrepancies = sum(1 for f in data['features'] if f['properties'].get('has_discrepancy'))
    high_severity = sum(1 for f in data['features'] if f['properties'].get('discrepancy_severity') == 'high')
    
    lines.append(f"- **Total Parcels:** {total}")
    lines.append(f"- **Total Discrepancies:** {discrepancies} ({discrepancies/total*100:.1f}%)")
    lines.append(f"- **High Severity:** {high_severity}")
    lines.append("")
    lines.append("## Legend")
    lines.append("- HIGH = High severity discrepancy (>25% area mismatch)")
    lines.append("- MEDIUM = Medium severity discrepancy (15-25% area mismatch)")
    lines.append("- OK = Verified (matched records)")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## All Land Owner Records")
    lines.append("")
    
    # Table header
    lines.append("| # | Plot ID | Owner (Hindi) | Owner (English) | Village | Computed (m2) | Recorded (m2) | Diff (m2) | Status |")
    lines.append("|---|---------|---------------|-----------------|---------|---------------|---------------|-----------|--------|")
    
    # Table rows
    for i, feature in enumerate(data['features'], 1):
        p = feature['properties']
        diff = p.get('area_difference_sqm', 0)
        
        if p.get('discrepancy_severity') == 'high':
            status = 'HIGH'
        elif p.get('has_discrepancy'):
            status = 'MEDIUM'
        else:
            status = 'OK'
        
        lines.append(f"| {i} | {p['plot_id']} | {p['owner_name_hi']} | {p['owner_name_en']} | {p['village_name']} | {p['computed_area_sqm']:.0f} | {p['recorded_area_sqm']:.0f} | {diff:.0f} | {status} |")
    
    # Write to file
    md_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "generated", "land_owners_data.md")
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"Created Markdown file: {md_path}")
    print(f"Total records: {total}")

if __name__ == "__main__":
    generate_markdown()
