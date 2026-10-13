/**
 * Pilier 6 : Qualité du code (Pondération globale : 10 %)
 * Évalue la présence de tests, des outils de validation et la structure du dépôt.
 * Total des points internes : 100 points.
 */

function hasMatchingFile(contentsList, targetNames) {
  if (!Array.isArray(contentsList)) return false;
  const targetLower = targetNames.map((name) => name.toLowerCase());
  return contentsList.some((item) => {
    if (!item || !item.name) return false;
    const name = String(item.name).toLowerCase();
    return targetLower.includes(name) || targetLower.some((target) => name.includes(target));
  });
}

function getPriorityForPoints(points) {
  if (points >= 15) return 'high';
  if (points >= 10) return 'medium';
  return 'low';
}

function hasNodeTestScript(packageJson) {
  const scripts = packageJson && typeof packageJson === 'object'
    ? packageJson.scripts
    : null;
  if (!scripts || typeof scripts !== 'object') return false;
  return Object.values(scripts).some((script) =>
    typeof script === 'string' && /\bnode\s+--test/.test(script)
  );
}

function hasNodeTestImport(testFiles) {
  if (!Array.isArray(testFiles)) return false;
  return testFiles.some((file) => {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') return false;
    const pathParts = file.path.split('/');
    const isTestFile = pathParts.length > 1 &&
      ['tests', 'test', '__tests__'].includes(pathParts[0]) &&
      /\.test\.(?:js|mjs|cjs)$/i.test(pathParts.at(-1));
    return isTestFile && /(?:\bfrom\s*['"]node:test['"]|\brequire\(\s*['"]node:test['"]\s*\))/.test(file.content);
  });
}

export function computeCodeQualityPillar(analysisData = {}) {
  const safeData = analysisData && typeof analysisData === 'object' ? analysisData : {};
  const rootContents = Array.isArray(safeData.rootContents) ? safeData.rootContents : [];
  const workflows = Array.isArray(safeData.workflows) ? safeData.workflows : [];

  const hasTestDir = rootContents.some((item) => {
    if (!item || !item.name) return false;
    const name = String(item.name).toLowerCase();
    return ['tests', 'test', 'spec', '__tests__'].includes(name);
  });

  const hasTestConfig = hasMatchingFile(rootContents, [
    'jest.config.js',
    'vitest.config.js',
    '.mocharc.json',
    'pytest.ini',
    'phpunit.xml',
    'playwright.config.js'
  ]) || hasNodeTestScript(safeData.packageJson) || hasNodeTestImport(safeData.testFiles);

  const hasCoverageConfig = hasMatchingFile(rootContents, [
    '.nycrc',
    'coverage',
    'codecov.yml',
    '.coveralls.yml'
  ]) || workflows.some((workflow) => {
    const haystack = `${workflow?.name || ''} ${workflow?.path || ''}`.toLowerCase();
    return haystack.includes('coverage');
  });

  const hasLinter = hasMatchingFile(rootContents, [
    '.eslintrc',
    '.eslintrc.json',
    '.eslintrc.js',
    'eslint.config.js',
    '.flake8',
    '.pylintrc',
    'ruff.toml',
    '.rubocop.yml',
    'biome.json'
  ]);

  const hasFormatter = hasMatchingFile(rootContents, [
    '.prettierrc',
    '.prettierrc.json',
    'prettier.config.js',
    '.editorconfig',
    'black.toml',
    '.rustfmt.toml',
    '.stylelintrc'
  ]);

  const rootNames = rootContents
    .filter((item) => item && item.name)
    .map((item) => String(item.name).toLowerCase());

  const projectStructure = ['src', 'lib', 'app', 'packages', 'modules'];
  const clearStructure = projectStructure.filter((name) => rootNames.includes(name)).length >= 2;

  const hasTypesSupport = hasMatchingFile(rootContents, ['tsconfig.json', 'py.typed', 'types', 'index.d.ts']) ||
    rootNames.some((name) => name.endsWith('.d.ts'));

  const checks = [
    {
      id: 'quality_tests_dir',
      labelKey: 'check_quality_tests_dir',
      passed: hasTestDir,
      weight: 25,
      points: hasTestDir ? 25 : 0,
      detail: hasTestDir ? 'Dossier de tests détecté' : null
    },
    {
      id: 'quality_test_config',
      labelKey: 'check_quality_test_config',
      passed: hasTestConfig,
      weight: 15,
      points: hasTestConfig ? 15 : 0,
      detail: hasTestConfig ? 'Configuration de tests détectée' : null
    },
    {
      id: 'quality_coverage',
      labelKey: 'check_quality_coverage',
      passed: hasCoverageConfig,
      weight: 15,
      points: hasCoverageConfig ? 15 : 0,
      detail: hasCoverageConfig ? 'Configuration de couverture détectée' : null
    },
    {
      id: 'quality_linter',
      labelKey: 'check_quality_linter',
      passed: hasLinter,
      weight: 15,
      points: hasLinter ? 15 : 0,
      detail: hasLinter ? 'Linter détecté' : null
    },
    {
      id: 'quality_formatter',
      labelKey: 'check_quality_formatter',
      passed: hasFormatter,
      weight: 10,
      points: hasFormatter ? 10 : 0,
      detail: hasFormatter ? 'Formatter détecté' : null
    },
    {
      id: 'quality_structure',
      labelKey: 'check_quality_structure',
      passed: clearStructure,
      weight: 10,
      points: clearStructure ? 10 : 0,
      detail: clearStructure ? 'Structure claire détectée' : null
    },
    {
      id: 'quality_types',
      labelKey: 'check_quality_types',
      passed: hasTypesSupport,
      weight: 10,
      points: hasTypesSupport ? 10 : 0,
      detail: hasTypesSupport ? 'Typage ou déclarations de types détectés' : null
    }
  ];

  for (const check of checks) {
    check.status = check.passed ? 'passed' : 'failed';
  }

  const totalScore = checks.reduce((sum, check) => sum + check.points, 0);
  const recommendations = [];

  for (const check of checks) {
    if (!check.passed) {
      recommendations.push({
        id: `rec_${check.id}`,
        labelKey: `rec_${check.id}`,
        points: check.weight,
        priority: getPriorityForPoints(check.weight)
      });
    }
  }

  recommendations.sort((a, b) => b.points - a.points);

  return {
    id: 'codeQuality',
    labelKey: 'report_pillar_code_quality',
    weight: 10,
    score: Math.min(100, Math.max(0, totalScore)),
    maxScore: 100,
    checks,
    recommendations
  };
}
