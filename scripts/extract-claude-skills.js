import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const skillsDir = '/tmp/awesome-claude-skills';
const outputDir = './apps/api/src/examples';

// Parse SKILL.md frontmatter and content
function parseSkillFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) return null;
  
  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];
  
  // Parse YAML frontmatter
  const metadata = {};
  frontmatter.split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value = match[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  });
  
  // Extract description, triggers, and strategies from content
  const description = metadata.description || body.split('\n')[0] || '';
  
  // Extract "When to Use" section for triggers
  const whenToUseMatch = body.match(/## When to Use[^\n]*\n([\s\S]*?)(?=\n## |$)/i);
  const triggers = [];
  if (whenToUseMatch) {
    whenToUseMatch[1].split('\n').forEach(line => {
      const bullet = line.match(/^[-*]\s*(.+)$/);
      if (bullet) triggers.push(bullet[1].trim());
    });
  }
  
  // Extract strategies from sections
  const strategies = [];
  const sections = body.match(/##+ ([^\n]+)\n([\s\S]*?)(?=\n##+ |$)/g) || [];
  sections.forEach(section => {
    const titleMatch = section.match(/##+ ([^\n]+)/);
    const contentMatch = section.match(/\n([\s\S]*?)(?=\n##+ |$)/);
    if (titleMatch && contentMatch) {
      const title = titleMatch[1].trim();
      const content = contentMatch[1].trim();
      if (title && content && !title.toLowerCase().includes('license') && content.length > 50) {
        strategies.push({ title, content: content.substring(0, 500) }); // Limit content length
      }
    }
  });
  
  // If no strategies found, create one from the main content
  if (strategies.length === 0 && body.length > 100) {
    strategies.push({
      title: 'Overview',
      content: body.substring(0, 500)
    });
  }
  
  return {
    skillName: metadata.name || 'unknown',
    description: description.substring(0, 300),
    triggers: triggers.length > 0 ? triggers.slice(0, 5) : [metadata.name || 'unknown'],
    strategies: strategies.slice(0, 4)
  };
}

// Find all SKILL.md files
function findSkillFiles(dir, files = []) {
  const entries = readdirSync(dir);
  entries.forEach(entry => {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        findSkillFiles(fullPath, files);
      } else if (entry === 'SKILL.md') {
        files.push(fullPath);
      }
    } catch (e) {
      // Skip
    }
  });
  return files;
}

// Extract skills
const skillFiles = findSkillFiles(skillsDir);
console.log(`Found ${skillFiles.length} skill files`);

const examples = [];
skillFiles.slice(0, 20).forEach(file => { // Limit to 20 for now
  try {
    const skill = parseSkillFile(file);
    if (skill && skill.description && skill.strategies.length > 0) {
      examples.push(skill);
    }
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
  }
});

console.log(`Extracted ${examples.length} valid examples`);

// Write examples to JSON file
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'claude-skills-examples.json'), JSON.stringify(examples, null, 2));
console.log(`✅ Wrote examples to ${outputDir}/claude-skills-examples.json`);
