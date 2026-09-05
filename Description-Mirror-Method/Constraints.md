# Project Constraints

## Global Rules

1. Use the MERN stack:
   - React
   - Express
   - MongoDB
   - Node.js

2. Use Tailwind CSS for styling.

3. The project is bilingual (Arabic + English), with Arabic as the primary language.
   - Support proper RTL layout for Arabic.
   - Support proper LTR layout for English.
   - Use modern, culturally appropriate UI design.
   - Use appropriate Google Fonts for both languages.

4. Use Font Awesome for icons.

5. Description Mirror Method (DMM):
   - Each DMM file represents the description of a page, feature, component, workflow, or other project requirement.
   - Treat DMM files as the primary source of project-specific requirements.
   - Do not invent project requirements that are not defined by the DMM files unless necessary to implement an explicitly defined requirement.

6. Project structure:
   - Frontend code must be placed under `client`.
   - Inside `client`, the React app should be organized under `src`.
   - Pages must be grouped inside `src/pages` by access type:
     - `PublicSidePages`
     - `ClientSidePages`
     - `AdminSidePages`
   - Reusable UI components must be organized under `src/components`.
   - Backend code must be placed under `server`.
   - The server should follow a clear structure such as `routes`, `controllers`, `models`, `middleware`, `config`, and `utils`.

---

## Security Rules

Apply security by design across both client and server.

- Validate, sanitize, and normalize all user input and API payloads.
- Use HTTPS in production.
- Use secure cookie configuration where cookies are used.
- Apply strict CORS policies.
- Protect against XSS, CSRF, NoSQL injection, and file-upload abuse.
- Store secrets in environment variables and never commit secrets to source control.
- Use secure authentication, strong password hashing, and secure session/token handling.
- Apply least-privilege principles to database, API, filesystem, and other resources.
- Implement appropriate rate limiting.
- Implement security-focused logging and monitoring.
- Regularly scan dependencies for known vulnerabilities.
- Apply appropriate security headers, including CSP, HSTS, X-Content-Type-Options, and Referrer-Policy.
- Enforce server-side authorization and access control for all protected resources.
- Prevent IDOR/BOLA and ensure users can access only resources they are authorized to access.
- Use strict request and response schemas and never expose sensitive internal errors, stack traces, or implementation details.
- Protect authentication sessions and tokens against leakage, replay, fixation, and unauthorized reuse.
- Enforce appropriate limits on request bodies, file uploads, pagination, and resource consumption to reduce denial-of-service and resource-exhaustion risks.

---

## SEO Rules

Apply modern SEO practices across the frontend, based on the content defined in the DMM files for each page, section, and feature.

- Use semantic HTML structure with meaningful heading hierarchy (`h1`, `h2`, `h3`) on every page.
- Assign a unique, descriptive page title and meta description for each page based on that page’s actual content and business purpose.
- Ensure all SEO metadata reflects the current DMM-defined content and does not contradict the page’s real purpose or messaging.
- Support bilingual SEO for Arabic and English, with Arabic as the primary language, including proper metadata, URL handling, and language-aware content structure.
- Use proper `hreflang` tags and locale-aware routing when the same content is available in both languages.
- Use clean, readable URLs that match the page intent and content structure.
- Add Open Graph and Twitter card metadata for social sharing previews.
- Include canonical URLs to prevent duplicate content issues.
- Add structured data using JSON-LD when relevant to the page content, such as organization, services, contact, or business information.
- Ensure all images include meaningful alt text, compressed formats, and responsive sizes for better SEO and performance.
- Keep page content relevant, clear, and user-focused, aligned with the actual business offering described in the DMM files.
- Prioritize the most important marketing and conversion sections according to each page’s content and user intent.
- Use accessible, mobile-friendly layouts that support both RTL and LTR behavior without harming SEO or usability.
- Ensure fast loading performance, especially for image-heavy or media-rich pages.
- Add `robots.txt` and `sitemap.xml` support where applicable for search engine indexing.
- Maintain consistent brand naming, metadata, and business descriptions across all pages and social previews.
- If DMM content evolves, update the SEO metadata, structured data, and page strategy to match the new content requirements.

---

## Project Context AJ-Industry Project:
   AJ-Industry specilized in designing, reverse engineering, imporving, 3D printing and counseltant , In industry machines ,The company provides many services (designing, reverse engineering,...) ther is three sides First: PublicSide that contains many pages specialy Home, About, PrintingCoutner, Service and Contact pages. Second: Client side that contains completely dashboard who track the client deals, pringing progress and booking. Third: Admin side , dashboard allowd admin to control everything in the site like settings, contacts and client situation and provides full detials or image about clients.


Note: All project-specific requirements, page descriptions, features, workflows, UI requirements, and other relevant details are defined in the remaining DMM files.

The DMM files should be consulted when implementing or modifying project functionality.
---






