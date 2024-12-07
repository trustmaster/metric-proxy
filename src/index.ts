/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		try {
			// Extract the URL from the request
			const url = new URL(request.url).searchParams.get('url');
			if (!url) {
				// Render a form to input the URL
				const formHtml = `
					<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1.0">
						<title>URL Input</title>
					</head>
					<body>
						<h1>Enter a URL to fetch and convert units</h1>
						<form method="get">
							<label for="url">URL:</label>
							<input type="text" id="url" name="url" required>
							<button type="submit">Submit</button>
						</form>
					</body>
					</html>
				`;
				return new Response(formHtml, {
					headers: { 'Content-Type': 'text/html' },
				});
			}

			// Fetch the HTML content from the URL
			const response = await fetch(url);
			if (!response.ok) {
				return new Response('Failed to fetch the URL', { status: response.status });
			}
			const html = await response.text();

			const convertedHtml = convertHTMLToMetric(html);

			// Return the modified HTML content
			return new Response(convertedHtml, {
				headers: { 'Content-Type': 'text/html' },
			});
		} catch (error) {
			console.error(error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;

function convertHTMLToMetric(htmlContent: string): string {
	// Function to convert fraction to decimal
	function fractionToDecimal(amount: string): number {
		const fractionMap: { [key: string]: number } = {
			'½': 0.5,
			'⅓': 1 / 3,
			'⅔': 2 / 3,
			'¼': 0.25,
			'¾': 0.75,
			'⅕': 1 / 5,
			'⅖': 2 / 5,
			'⅗': 3 / 5,
			'⅘': 4 / 5,
			'⅙': 1 / 6,
			'⅚': 5 / 6,
			'⅐': 1 / 7,
			'⅛': 1 / 8,
			'⅜': 3 / 8,
			'⅝': 5 / 8,
			'⅞': 7 / 8,
			'⅑': 1 / 9,
			'⅒': 1 / 10,
		};

		if (fractionMap[amount]) {
			return fractionMap[amount];
		}

		if (amount.includes('/')) {
			const [numerator, denominator] = amount.split('/').map(Number);
			if (!isNaN(numerator) && !isNaN(denominator)) {
				return numerator / denominator;
			}
		} else {
			const number = Number(amount);
			if (!isNaN(number)) {
				return number;
			}
		}
		throw new Error(`Invalid amount: ${amount}`);
	}

	// Function to convert units from imperial to metric
	function convertUnit(unit: string, amount: number): { convertedUnit: string; convertedAmount: number } | null {
		const unitConversions: { [key: string]: { unit: string; factor: number } } = {
			cup: { unit: 'ml', factor: 240 },
			cups: { unit: 'ml', factor: 240 },
			ounce: { unit: 'g', factor: 28.3495 },
			ounces: { unit: 'g', factor: 28.3495 },
			oz: { unit: 'g', factor: 28.3495 },
			pound: { unit: 'g', factor: 453.592 },
			pounds: { unit: 'g', factor: 453.592 },
			lb: { unit: 'g', factor: 453.592 },
		};
		const conversion = unitConversions[unit.toLowerCase()];
		if (conversion) {
			return { convertedUnit: conversion.unit, convertedAmount: amount * conversion.factor };
		}
		return null; // Return null if no conversion is needed
	}

	// Function to format the converted amount
	function formatAmount(amount: number): string {
		return amount % 1 === 0 ? amount.toString() : amount.toFixed(2);
	}

	// Regular expression to find each ingredient
	const ingredientRegex = /<li class="wprm-recipe-ingredient"[^>]*>([\s\S]*?)<\/li>/g;

	let modifiedHtmlContent = htmlContent.replace(ingredientRegex, (match) => {
		// Extract the amount and unit
		const amountMatch = match.match(/<span class="wprm-recipe-ingredient-amount">([^<]+)<\/span>/);
		const unitMatch = match.match(/<span class="wprm-recipe-ingredient-unit">([^<]+)<\/span>/);

		if (amountMatch && unitMatch) {
			const amountText = amountMatch[1].trim();
			const unitText = unitMatch[1].trim();

			try {
				// Convert fraction to decimal
				const decimalAmount = fractionToDecimal(amountText);

				// Convert unit and amount if needed
				const conversion = convertUnit(unitText, decimalAmount);
				if (conversion) {
					const { convertedUnit, convertedAmount } = conversion;

					// Format the converted amount
					const formattedAmount = formatAmount(convertedAmount);

					// Replace the amount and unit in the original match
					return match
						.replace(amountMatch[0], `<span class="wprm-recipe-ingredient-amount">${formattedAmount}</span>`)
						.replace(unitMatch[0], `<span class="wprm-recipe-ingredient-unit">${convertedUnit}</span>`);
				}
			} catch (error) {
				console.error(error.message);
			}
		}

		return match; // Return the original match if no conversion is needed
	});

	// Regular expression to find plain text amounts followed by units
	const plainTextRegex = /(\d+\/\d+|\d+|\d+\.\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]+)\s+(cup|cups|ounce|ounces|oz|pound|pounds|lb)/gi;

	modifiedHtmlContent = modifiedHtmlContent.replace(plainTextRegex, (match, p1, p2) => {
		try {
			// Convert fraction to decimal
			const decimalAmount = fractionToDecimal(p1.trim());

			// Convert unit and amount if needed
			const conversion = convertUnit(p2.trim(), decimalAmount);
			if (conversion) {
				const { convertedUnit, convertedAmount } = conversion;

				// Format the converted amount
				const formattedAmount = formatAmount(convertedAmount);

				// Replace the amount and unit in the original match
				return `${formattedAmount} ${convertedUnit}`;
			}
		} catch (error) {
			console.error(error.message);
		}

		return match; // Return the original match if no conversion is needed
	});

	return modifiedHtmlContent;
}
