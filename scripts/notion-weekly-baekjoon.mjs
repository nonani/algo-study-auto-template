#!/usr/bin/env node

import {
  extractBaekjoonProblemId,
  getUpcomingSundayInKst,
  isTruthyEnv,
  tierLabelFromSolvedLevel,
  toHyphenatedNotionId
} from "../src/utils.mjs";

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = process.env.NOTION_VERSION ?? "2025-09-03";

const DEFAULTS = {
  databaseId: "",
  baekjoonPageId: "",
  titleProperty: "문제",
  dateProperty: "날짜",
  platformProperty: "플랫폼",
  levelProperty: "주제",
  urlProperty: "링크",
  memberCheckboxProperties: [],
  problemCount: 10,
  solvedAcQuery: "*"
};

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || String(value).trim() === "") {
    return fallback;
  }
  return String(value).trim();
}

function assertEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function notionRequest({ token, method = "GET", path, body }) {
  const response = await fetch(`${NOTION_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[Notion ${response.status}] ${method} ${path} failed: ${text}`);
  }

  return response.json();
}

async function resolveDataSourceId({ notionToken, databaseId, dataSourceId }) {
  if (dataSourceId) {
    return toHyphenatedNotionId(dataSourceId);
  }

  if (!databaseId) {
    throw new Error("Either NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID must be provided.");
  }

  const hyphenatedDatabaseId = toHyphenatedNotionId(databaseId);
  const database = await notionRequest({
    token: notionToken,
    path: `/databases/${hyphenatedDatabaseId}`
  });

  if (Array.isArray(database.data_sources) && database.data_sources.length > 0) {
    return toHyphenatedNotionId(database.data_sources[0].id);
  }

  // Fallback for workspaces where database id == data source id.
  return hyphenatedDatabaseId;
}

async function queryAllRows({ notionToken, dataSourceId, filter }) {
  const results = [];
  let cursor = undefined;

  while (true) {
    const payload = {
      page_size: 100,
      ...(filter ? { filter } : {}),
      ...(cursor ? { start_cursor: cursor } : {})
    };

    const response = await notionRequest({
      token: notionToken,
      method: "POST",
      path: `/data_sources/${dataSourceId}/query`,
      body: payload
    });

    results.push(...(response.results ?? []));
    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  return results;
}

function getPropertySchemaOrThrow(dataSource, name) {
  const schema = dataSource.properties?.[name];
  if (!schema) {
    const available = Object.keys(dataSource.properties ?? {}).join(", ");
    throw new Error(`Property "${name}" not found. Available: ${available}`);
  }
  return schema;
}

function readPlainText(richTextArray = []) {
  return richTextArray.map((item) => item.plain_text ?? "").join("").trim();
}

function readUrlFromProperty(property) {
  if (!property || !property.type) return null;
  if (property.type === "url") return property.url ?? null;
  if (property.type === "rich_text") return readPlainText(property.rich_text);
  if (property.type === "title") return readPlainText(property.title);
  return null;
}

function extractProblemIdFromRow(row, { urlPropertyName, titlePropertyName }) {
  const urlValue = readUrlFromProperty(row.properties?.[urlPropertyName]);
  const fromUrl = extractBaekjoonProblemId(urlValue);
  if (fromUrl) return fromUrl;

  const titleValue = readPlainText(row.properties?.[titlePropertyName]?.title);
  return extractBaekjoonProblemId(titleValue);
}

function buildOptionalPropertyValue({ type, textValue, numericValue, urlValue }) {
  if (type === "rich_text") {
    return { rich_text: [{ type: "text", text: { content: textValue } }] };
  }
  if (type === "select") {
    return { select: { name: textValue } };
  }
  if (type === "multi_select") {
    return { multi_select: [{ name: textValue }] };
  }
  if (type === "number") {
    return { number: numericValue };
  }
  if (type === "url") {
    return { url: urlValue };
  }
  return null;
}

function buildNewPageProperties({
  dataSource,
  problem,
  targetDate,
  baekjoonPageId,
  propertyNames,
  memberCheckboxProperties
}) {
  const properties = {};

  const titleSchema = getPropertySchemaOrThrow(dataSource, propertyNames.title);
  if (titleSchema.type !== "title") {
    throw new Error(`Property "${propertyNames.title}" must be title type.`);
  }
  properties[propertyNames.title] = {
    title: [{ type: "text", text: { content: problem.titleKo || `백준 ${problem.problemId}` } }]
  };

  const dateSchema = getPropertySchemaOrThrow(dataSource, propertyNames.date);
  if (dateSchema.type !== "date") {
    throw new Error(`Property "${propertyNames.date}" must be date type.`);
  }
  properties[propertyNames.date] = { date: { start: targetDate } };

  const platformSchema = getPropertySchemaOrThrow(dataSource, propertyNames.platform);
  if (platformSchema.type !== "relation") {
    throw new Error(`Property "${propertyNames.platform}" must be relation type.`);
  }
  properties[propertyNames.platform] = { relation: [{ id: baekjoonPageId }] };

  const levelSchema = dataSource.properties?.[propertyNames.level];
  const levelValue = tierLabelFromSolvedLevel(problem.level);
  if (levelSchema) {
    const optional = buildOptionalPropertyValue({
      type: levelSchema.type,
      textValue: levelValue,
      numericValue: Number(problem.level),
      urlValue: null
    });
    if (optional) properties[propertyNames.level] = optional;
  }

  const urlSchema = dataSource.properties?.[propertyNames.url];
  if (urlSchema) {
    const optional = buildOptionalPropertyValue({
      type: urlSchema.type,
      textValue: problem.url,
      numericValue: null,
      urlValue: problem.url
    });
    if (optional) properties[propertyNames.url] = optional;
  }

  for (const memberProperty of memberCheckboxProperties) {
    const schema = dataSource.properties?.[memberProperty];
    if (schema?.type === "checkbox") {
      properties[memberProperty] = { checkbox: false };
    }
  }

  return properties;
}

async function fetchRandomBaekjoonProblems({ query, count, existingProblemIds }) {
  const picked = [];
  const seen = new Set(existingProblemIds);
  const maxRequests = 80;

  for (let requestCount = 0; requestCount < maxRequests && picked.length < count; requestCount += 1) {
    const url = new URL("https://solved.ac/api/v3/search/problem");
    url.searchParams.set("query", query);
    url.searchParams.set("sort", "random");
    url.searchParams.set("page", "1");

    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`[solved.ac ${response.status}] Failed to fetch random problems.`);
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    for (const item of items) {
      if (!item?.problemId) continue;
      if (item.isSolvable === false) continue;

      const id = String(item.problemId);
      if (seen.has(id)) continue;
      seen.add(id);

      picked.push({
        problemId: item.problemId,
        titleKo: item.titleKo ?? item.title ?? `BOJ ${item.problemId}`,
        level: Number(item.level ?? 0),
        url: `https://www.acmicpc.net/problem/${item.problemId}`
      });

      if (picked.length >= count) break;
    }
  }

  if (picked.length < count) {
    throw new Error(`Could not collect enough unique problems. Required=${count}, collected=${picked.length}`);
  }

  return picked;
}

async function main() {
  const notionToken = assertEnv("NOTION_TOKEN");
  const dryRun = isTruthyEnv(getEnv("DRY_RUN", "false"));

  const databaseId = getEnv("NOTION_DATABASE_ID", DEFAULTS.databaseId);
  const dataSourceIdFromEnv = getEnv("NOTION_DATA_SOURCE_ID");
  const dataSourceId = await resolveDataSourceId({
    notionToken,
    databaseId,
    dataSourceId: dataSourceIdFromEnv
  });

  const baekjoonPageId = toHyphenatedNotionId(
    getEnv("NOTION_BAEKJOON_PAGE_ID", DEFAULTS.baekjoonPageId)
  );
  if (!baekjoonPageId) {
    throw new Error("NOTION_BAEKJOON_PAGE_ID is required.");
  }
  const targetDate = getEnv("TARGET_DATE", getUpcomingSundayInKst());

  const problemCount = Number(getEnv("PROBLEM_COUNT", String(DEFAULTS.problemCount)));
  if (!Number.isFinite(problemCount) || problemCount <= 0) {
    throw new Error(`Invalid PROBLEM_COUNT: ${problemCount}`);
  }

  const propertyNames = {
    title: getEnv("NOTION_TITLE_PROPERTY", DEFAULTS.titleProperty),
    date: getEnv("NOTION_DATE_PROPERTY", DEFAULTS.dateProperty),
    platform: getEnv("NOTION_PLATFORM_PROPERTY", DEFAULTS.platformProperty),
    level: getEnv("NOTION_LEVEL_PROPERTY", DEFAULTS.levelProperty),
    url: getEnv("NOTION_URL_PROPERTY", DEFAULTS.urlProperty)
  };

  const memberCheckboxProperties = getEnv(
    "NOTION_MEMBER_CHECKBOX_PROPERTIES",
    DEFAULTS.memberCheckboxProperties.join(",")
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const solvedAcQuery = getEnv("SOLVEDAC_QUERY", DEFAULTS.solvedAcQuery);

  console.log(`[info] targetDate=${targetDate}, dataSourceId=${dataSourceId}, dryRun=${dryRun}`);

  const dataSource = await notionRequest({
    token: notionToken,
    path: `/data_sources/${dataSourceId}`
  });

  // Global duplicate prevention: do not pick already registered Baekjoon problems.
  const allBaekjoonRows = await queryAllRows({
    notionToken,
    dataSourceId,
    filter: {
      property: propertyNames.platform,
      relation: { contains: baekjoonPageId }
    }
  });

  const existingProblemIds = new Set(
    allBaekjoonRows
      .map((row) =>
        extractProblemIdFromRow(row, {
          urlPropertyName: propertyNames.url,
          titlePropertyName: propertyNames.title
        })
      )
      .filter(Boolean)
  );

  // Date-level guard: fill only missing rows for this Sunday.
  const rowsForTargetDate = await queryAllRows({
    notionToken,
    dataSourceId,
    filter: {
      and: [
        { property: propertyNames.date, date: { equals: targetDate } },
        { property: propertyNames.platform, relation: { contains: baekjoonPageId } }
      ]
    }
  });

  const remaining = Math.max(0, problemCount - rowsForTargetDate.length);
  if (remaining === 0) {
    console.log(
      `[skip] ${targetDate} already has ${rowsForTargetDate.length} Baekjoon rows. Nothing to add.`
    );
    return;
  }

  const selected = await fetchRandomBaekjoonProblems({
    query: solvedAcQuery,
    count: remaining,
    existingProblemIds
  });

  if (dryRun) {
    console.log("[dry-run] Problems selected:");
    for (const problem of selected) {
      console.log(`- ${problem.problemId} | ${problem.titleKo} | ${problem.url}`);
    }
    return;
  }

  for (const problem of selected) {
    const properties = buildNewPageProperties({
      dataSource,
      problem,
      targetDate,
      baekjoonPageId,
      propertyNames,
      memberCheckboxProperties
    });

    await notionRequest({
      token: notionToken,
      method: "POST",
      path: "/pages",
      body: {
        parent: { data_source_id: dataSourceId },
        properties
      }
    });

    console.log(`[created] ${problem.problemId} | ${problem.titleKo}`);
  }

  console.log(`[done] Added ${selected.length} problem(s) for ${targetDate}.`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
