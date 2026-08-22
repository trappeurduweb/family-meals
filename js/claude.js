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
      'Réponds UNIQUEMENT avec un JSON de la forme {"name": string, "type": "proteine"|"accompagnement"|"plat_complet", ' +
      '"ingredients": [{"name": string, "qty": number, "unit": string}]}. ' +
      "type vaut \"proteine\" si le plat n'est qu'une source de protéine (ex: poulet rôti seul), " +
      "\"accompagnement\" si c'est un accompagnement seul (ex: riz, purée, salade), " +
      "ou \"plat_complet\" si le plat se suffit à lui-même (ex: lasagnes, quiche, plat unique). " +
      "Propose une estimation raisonnable des ingrédients principaux, sans être exhaustif sur les condiments.",
    userText: "Identifie ce plat, son type, et ses ingrédients probables.",
    imageBase64,
    imageMediaType,
  });
  return extractJson(text);
}

export async function generateWeeklyMenu({ recipes, weeklyPattern, members, targetSlots }) {
  const text = await callClaude({
    system:
      "Tu es un assistant qui planifie les repas d'une famille française. " +
      "targetSlots contient la liste EXACTE des créneaux (jour, repas) à planifier, dans l'ordre chronologique réel " +
      "(le premier créneau de la liste est le tout prochain repas de la famille). " +
      "Tu dois générer un plat pour CHAQUE créneau de targetSlots, et UNIQUEMENT ceux-là — n'en ajoute aucun autre et n'en oublie aucun. " +
      "Repars en priorité des recettes habituelles fournies, en tenant compte des contraintes de chaque membre " +
      "(régime, aliments non aimés, portions) et de qui est présent à chaque repas. " +
      "Chaque recette fournie a un type: \"proteine\", \"accompagnement\" ou \"plat_complet\". " +
      "Règle impérative de composition d'un repas: si tu choisis une recette de type \"proteine\" pour un créneau, " +
      "tu DOIS lui associer une recette de type \"accompagnement\" dans le même créneau (et inversement). " +
      "Un repas ne peut donc contenir soit UNE recette \"plat_complet\" seule, soit exactement UNE \"proteine\" + UNE \"accompagnement\" ensemble. " +
      "Ajoute 1 à 2 suggestions de recettes nouvelles inspirées des goûts de la famille (pas seulement des variantes) ; " +
      "assigne-leur un type cohérent et respecte la même règle d'association (si tu inventes une nouvelle protéine, " +
      "associe-la à un accompagnement existant ou à un nouvel accompagnement que tu inventes aussi). " +
      "Tu peux proposer le(s) même(s) plat(s) en \"restes\" sur 2 créneaux consécutifs si cela réduit la charge de cuisine. " +
      'Réponds UNIQUEMENT avec un JSON de la forme {"slots": [{"day": "lun".."dim", "meal": "dejeuner"|"diner", ' +
      '"dishes": [{"recipeName": string, "type": "proteine"|"accompagnement"|"plat_complet", "isNewSuggestion": boolean, "isLeftoverOf": string|null}], ' +
      '"ingredients": [{"name": string, "qty": number, "unit": string, "aisle": string}]}]}. ' +
      "dishes contient soit 1 élément (plat_complet), soit 2 éléments (une proteine + un accompagnement). " +
      "ingredients contient la liste combinée de tous les ingrédients nécessaires pour l'ensemble du repas de ce créneau. " +
      "aisle doit être une des valeurs: fruits_legumes, cremerie, viande_poisson, epicerie, surgele, boulangerie, autre.",
    userText: JSON.stringify({ recipes, weeklyPattern, members, targetSlots }),
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
