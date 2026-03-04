const fs = require('fs');
const path = 'c:\\Users\\login\\OneDrive\\Área de Trabalho\\Projetos\\sistema-de-gest-o\\frontend\\src\\pages\\RHManagement.tsx';
let content = fs.readFileSync(path, 'utf8');

// Rename Users icon to avoid collision and potential ReferenceError
content = content.replace(/Calendar, Users, Clock/g, "Calendar, Users as UsersIcon, Clock");
content = content.replace(/<Users /g, "<UsersIcon ");
content = content.replace(/<\/Users>/g, "</UsersIcon>");

fs.writeFileSync(path, content, 'utf8');
console.log("Renamed Users icon to UsersIcon in RHManagement.tsx");
