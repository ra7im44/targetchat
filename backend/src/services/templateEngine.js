const { EmailTemplate } = require('../models');

/**
 * TemplateEngine - Renders email templates with variable substitution
 */
class TemplateEngine {
    /**
     * Render a template with provided variables
     * @param {string} templateSlug - Template slug (e.g., 'welcome', 'password-reset')
     * @param {Object} variables - Key-value pairs for substitution
     * @param {string} [language='en'] - Template language
     * @returns {Promise<Object>} - { subject, html, text, templateId }
     */
    async render(templateSlug, variables = {}, language = 'en') {
        try {
            // Load template from database
            const template = await EmailTemplate.findOne({
                where: {
                    slug: templateSlug,
                    language,
                    isActive: true
                }
            });

            if (!template) {
                throw new Error(`Template not found: ${templateSlug} (${language})`);
            }

            // Validate that all required variables are provided
            this.validateVariables(template, variables);

            // Render subject and body
            const subject = this.replaceVariables(template.subject, variables);
            const html = this.replaceVariables(template.htmlBody, variables);
            const text = template.textBody
                ? this.replaceVariables(template.textBody, variables)
                : this.stripHTML(html);

            return {
                templateId: template.id,
                subject,
                html,
                text
            };
        } catch (error) {
            console.error(`❌ Template rendering failed for "${templateSlug}":`, error.message);
            throw error;
        }
    }

    /**
     * Replace {{placeholders}} with actual values
     * @param {string} content - Content with placeholders
     * @param {Object} variables - Key-value pairs
     * @returns {string} - Rendered content
     */
    replaceVariables(content, variables) {
        let rendered = content;

        // Replace all {{variable}} occurrences
        Object.keys(variables).forEach(key => {
            const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            rendered = rendered.replace(placeholder, variables[key] || '');
        });

        // Warn if there are unreplaced placeholders
        const unreplaced = rendered.match(/{{[^}]+}}/g);
        if (unreplaced) {
            console.warn(`⚠️  Unreplaced placeholders found: ${unreplaced.join(', ')}`);
        }

        return rendered;
    }

    /**
     * Validate that all required variables are provided
     * @param {Object} template - EmailTemplate instance
     * @param {Object} providedVars - Variables provided by caller
     * @throws {Error} - If required variables are missing
     */
    validateVariables(template, providedVars) {
        if (!template.variables || template.variables.length === 0) {
            return; // No required variables
        }

        const missing = template.variables.filter(varName => !(varName in providedVars));

        if (missing.length > 0) {
            throw new Error(
                `Missing required variables for template "${template.slug}": ${missing.join(', ')}`
            );
        }
    }

    /**
     * Strip HTML tags for plain text
     * @param {string} html - HTML string
     * @returns {string} - Plain text
     */
    stripHTML(html) {
        return html
            .replace(/<style[^>]*>.*<\/style>/gis, '') // Remove style tags
            .replace(/<script[^>]*>.*<\/script>/gis, '') // Remove script tags
            .replace(/<[^>]+>/g, '') // Remove all HTML tags
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();
    }

    /**
     * Preview a template with sample data (for admin dashboard)
     * @param {number} templateId - Template ID
     * @param {Object} sampleVars - Sample variables
     * @returns {Promise<Object>} - { subject, html, text }
     */
    async preview(templateId, sampleVars = {}) {
        const template = await EmailTemplate.findByPk(templateId);

        if (!template) {
            throw new Error(`Template not found: ID ${templateId}`);
        }

        // Use sample data or placeholders
        const variables = { ...sampleVars };

        // Fill missing variables with placeholder text
        if (template.variables) {
            template.variables.forEach(varName => {
                if (!(varName in variables)) {
                    variables[varName] = `[${varName.toUpperCase()}]`;
                }
            });
        }

        const subject = this.replaceVariables(template.subject, variables);
        const html = this.replaceVariables(template.htmlBody, variables);
        const text = template.textBody
            ? this.replaceVariables(template.textBody, variables)
            : this.stripHTML(html);

        return { subject, html, text };
    }

    /**
     * Sanitize HTML to prevent XSS (basic implementation)
     * @param {string} html - HTML string
     * @returns {string} - Sanitized HTML
     */
    sanitizeHTML(html) {
        // Remove potentially dangerous tags and attributes
        return html
            .replace(/<script[^>]*>.*<\/script>/gis, '')
            .replace(/<iframe[^>]*>.*<\/iframe>/gis, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove inline event handlers
            .replace(/javascript:/gi, ''); // Remove javascript: protocol
    }
}

module.exports = new TemplateEngine();
