import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const desktop = path.join(os.homedir(), 'Desktop');
const shortcutPath = path.join(desktop, '3M Atelier - Optimisation.lnk');
const targetBat = path.resolve(process.cwd(), 'LANCER_3M_ATELIER.bat');
const workingDir = process.cwd();

const psScript = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}')
$s.TargetPath = '${targetBat.replace(/\\/g, '\\\\')}'
$s.WorkingDirectory = '${workingDir.replace(/\\/g, '\\\\')}'
$s.Description = '3M Atelier - Optimisation de Decoupe'
$s.Save()
`;

try {
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, '; ')}"`, { stdio: 'inherit' });
  console.log('✅ Raccourci créé sur le Bureau :', shortcutPath);
} catch (e) {
  console.error('Erreur:', e);
}
