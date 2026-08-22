import { getSetting } from "./db.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

async function callClaude({ system, userText, imageBase64, imageMediaType, maxTokens = 4096 }) {
  const apiKey = await getSetting("apiKey");
  if (!apiKey) {
    throw new Error("Clé API Claude manquante. Renseigne-la dans Réglages.");
  }

  const content = [];
  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: imageMediaType || "image/jpeg", data: imageBase64 },
    });
  }
  content.push({ type: "text", text: userText });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      // On désactive le raisonnement (thinking) : ces appels ne font que de
      // l'extraction/génération structurée, pas besoin de réflexion étendue,
      // et ça évite que le budget de tokens parte dans le "thinking" au lieu
      // de la réponse JSON attendue.
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Erreur API Claude (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) {
    const reason = data.stop_reason ? ` (stop_reason: ${data.stop_reason})` : "";
    throw new Error(`Réponse IA vide${reason}. Réessaie, ou simplifie la demande.`);
  }
  return textBlock.text;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Réponse IA sans JSON exploitable : " + text);
  try {
    return JSON.parse(match[0]);
  } catch (err) {
    throw new Error("Réponse IA tronquée ou JSON invalide : " + err.message);
  }
}

export async function analyzeReceiptPhoto(imageBase64, imageMediaType) {
  const text = await callClaude({
    system:
      "Tu analyses une photo de ticket de caisse français. Réponds UNIQUEMENT avec un JSON de la forme " +
      '{"items": [{"name": string, "qty": number, "unit": string, "category": string}]}. ' +
      "category doit être une des valeurs: fruits_legumes, cremerie, viande_poisson, epicerie, surgele, boulangerie, autre. " +
      "Ignore les lignes qui ne sont pas des articles (total, TVA, carte...).",
    userText: "Extrait les articles achetés sur ce ticket.",
    imageBase64,
    imageMediaType,
  });
  return extractJson(text);
}

export async function analyzeMealPhoto(imageBase64, imageMediaType) {
  const text = await callClaude({
    system:
      "Tu identifies un plat à partir d'une photo pour construire une bibliothèque de recettes familiales. " +
      'Réponds UNIQUEMENT avec un JSON de la forme {"name": string, "ingredients": [{"name": string, "qty": number, "unit": string}]}. ' +
      "Propose une estimation raisonnable des ingrédients principaux, sans être exhaustif sur les condiments.",
    userText: "Identifie ce plat et ses ingrédients probables.",
    imageBase64,
    imageMediaType,
  });
  return extractJson(text);
}

export async function generateWeeklyMenu({ recipes, weeklyPattern, members }) {
  const text = await callClaude({
    system:
      "Tu es un assistant qui planifie les repas d'une famille française pour la semaine (déjeuners + dîners). " +
      "Repars en priorité des recettes habituelles fournies, en tenant compte des contraintes de chaque membre " +
      "(régime, aliments non aimés, portions) et de qui est présent à chaque repas. " +
      "Ajoute 1 à 2 suggestions de recettes nouvelles inspirées des goûts de la famille (pas seulement des variantes). " +
      "Tu peux proposer un même plat en \"restes\" sur 2 créneaux consécutifs si cela réduit la charge de cuisine. " +
      'Réponds UNIQUEMENT avec un JSON de la forme {"slots": [{"day": "lun".."dim", "meal": "dejeuner"|"diner", ' +
      '"recipeName": string, "isNewSuggestion": boolean, "isLeftoverOf": string|null, ' +
      '"ingredients": [{"name": string, "qty": number, "unit": string, "aisle": string}]}]}. ' +
      "aisle doit être une des valeurs: fruits_legumes, cremerie, viande_poisson, epicerie, surgele, boulangerie, autre.",
    userText: JSON.stringify({ recipes, weeklyPattern, members }),
    maxTokens: 8192,
  });
  return extractJson(text);
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
