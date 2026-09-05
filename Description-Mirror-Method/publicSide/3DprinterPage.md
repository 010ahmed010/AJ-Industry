## 3D Printer Page

This page is a public-facing page that allows any visitor to estimate the cost of a 3D printed model. The page is designed to provide a simple and practical user experience for customers who want to understand the cost before placing an order.

The page consists of three main sections:

1. Cost Estimation:
   - Visitors can estimate the cost of a model based on model weight and file details.
   - Supported file formats include `.stl`, `.3mf`, and `.obj`.
   - The cost calculation can be handled using a technology such as Three.js.
   - If the uploaded file is not supported, the user can manually enter the model weight to continue with the cost estimation.
   - This feature is intended only for pricing estimation and is not the full order process.

2. Friendly Material Guidance Table:
   - A button should direct users to a related page that provides detailed guidance on material selection.
   - The linked page is `Description-Mirror-Method/publicSide/FriendlyMaterialGuidanceTablePage.md`.
   - This section helps visitors choose the most suitable material based on their application and printing requirements.

3. Delivery Options:
   - This section should explain the delivery service and include a dropdown list of cities where delivery is available.
   - The list of cities should be managed through the admin panel.
   - The page should clearly present delivery availability to improve customer convenience and conversion.