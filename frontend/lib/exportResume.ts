export function exportResumeToPDF(resumeData: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        throw new Error('Please allow popups to export PDF');
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${resumeData.personal_info.name} - Resume</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; padding: 40px; background: white; color: black; line-height: 1.6; }
.header { border-bottom: 4px solid black; padding-bottom: 20px; margin-bottom: 20px; }
h1 { font-size: 32px; margin-bottom: 10px; }
.contact { display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px; color: #333; margin-top: 10px; }
h2 { font-size: 20px; margin: 20px 0 15px 0; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
.item { margin-bottom: 15px; }
.item-header { display: flex; justify-between; margin-bottom: 5px; }
.item-title { font-weight: bold; font-size: 16px; }
.item-subtitle { font-style: italic; color: #555; margin-bottom: 8px; }
ul { margin-left: 20px; margin-top: 8px; }
li { margin-bottom: 5px; }
@media print { body { padding: 20px; } }
</style></head><body>
<div class="header"><h1>${resumeData.personal_info.name}</h1>
<div class="contact">
${resumeData.personal_info.email ? `<div>📧 ${resumeData.personal_info.email}</div>` : ''}
${resumeData.personal_info.phone ? `<div>📞 ${resumeData.personal_info.phone}</div>` : ''}
${resumeData.personal_info.website ? `<div>🌐 ${resumeData.personal_info.website}</div>` : ''}
${resumeData.personal_info.location ? `<div>📍 ${resumeData.personal_info.location}</div>` : ''}
</div></div>
${resumeData.summary ? `<div><h2>PROFESSIONAL SUMMARY</h2><p>${resumeData.summary}</p></div>` : ''}
${resumeData.experience?.length ? `<div><h2>EXPERIENCE</h2>${resumeData.experience.map((e: any) => `
<div class="item">
<div class="item-header"><div class="item-title">${e.title}</div><div>${e.duration}</div></div>
<div class="item-subtitle">${e.organization}</div><p>${e.description}</p>
${e.achievements?.length ? `<ul>${e.achievements.map((a: string) => `<li>${a}</li>`).join('')}</ul>` : ''}
</div>`).join('')}</div>` : ''}
${resumeData.projects?.length ? `<div><h2>PROJECTS</h2>${resumeData.projects.map((p: any) => `
<div class="item"><div class="item-title">${p.name}</div><p>${p.description}</p>
${p.technologies?.length ? `<p><b>Technologies:</b> ${p.technologies.join(', ')}</p>` : ''}
${p.highlights?.length ? `<ul>${p.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>` : ''}
</div>`).join('')}</div>` : ''}
${resumeData.skills ? `<div><h2>SKILLS</h2>
${resumeData.skills.technical?.length ? `<div><b>Technical:</b> ${resumeData.skills.technical.join(', ')}</div>` : ''}
${resumeData.skills.tools?.length ? `<div><b>Tools:</b> ${resumeData.skills.tools.join(', ')}</div>` : ''}
${resumeData.skills.soft?.length ? `<div><b>Soft Skills:</b> ${resumeData.skills.soft.join(', ')}</div>` : ''}
</div>` : ''}
${resumeData.education?.length ? `<div><h2>EDUCATION</h2>${resumeData.education.map((edu: any) => `
<div class="item">
<div class="item-header"><div class="item-title">${edu.degree}</div><div>${edu.duration}</div></div>
<div class="item-subtitle">${edu.institution}</div>
</div>`).join('')}</div>` : ''}
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}
