# Threads.com Admin Guide: Products

This guide covers adding and editing products, product images, and colour photos in the admin panel.

## 1. Sign in

1. Open `/admin/login` in your browser.
2. Sign in with an admin account. Customer accounts cannot open admin pages.
3. Choose **Products** in the left menu (`/admin/products`).

## 2. Add a product

1. Click **+ Add product**. The form opens at the top of the page.
2. Fill in the basic fields:
   - **Name**, **Description**, **Category**: required.
   - **Price** (₹): zero or more.
   - **Gender**: Men, Women or Unisex.
   - **Stock**: a whole number, zero or more. Products with zero stock show as out of stock.
   - **Sizes**: separate with commas, for example `S, M, L, XL`.
   - **Colors**: separate with commas, for example `Black, White`.
3. Add product images (section 3) and colour photos (section 4).
4. Tick **Feature this product in the store** if it should appear in featured areas.
5. Click **Create product**.

## 3. Product images

All images for a product go in one list, in the **Product images** section. You can add them in two ways, and you can mix both:

- **Add a link:** paste a full image address that starts with `https://` (or `http://`), then click **Add link**. You can also press Enter.
- **Upload from computer:** click **Upload from computer** and choose one or more files. Files are uploaded when you save the product.

Rules:
- Up to **6 images** per product.
- Accepted formats: **JPG, PNG, WEBP, GIF**.
- Each file must be **5 MB or smaller**.
- The **first image is the main photo** shown in the shop. To make another image the main one, remove the images before it, then add them again after it.
- Each image has an **✕** button to remove it. Removing an image also clears any colour that was using it.

## 4. Colour photos

Under **Colour photos**, each colour you listed gets its own row with thumbnails of all the product images.

1. Click the thumbnail that shows that colour. It gets a dark border and the row says **Photo selected**.
2. Click the same thumbnail again to clear it. The row then says **No photo: the main image is shown**.

When a shopper selects a colour on the product page, the page shows that colour's photo. A colour with no photo keeps the current picture.

Tip: upload or link all the photos first, then pick the colour photos. The colour rows only list images that are already in the list.

## 5. Edit a product

1. In the product list, click **Edit** on the row.
2. The form loads with the current images and colour photos selected.
3. Change what you need, then click **Save changes**.

Removing an image, or changing a colour name, updates the product when you save.

## 6. View or delete a product

- **View**: click **View product** on the row to open a preview.
- **Delete**: click **Delete** on the row and confirm. Deleting a product cannot be undone.

## 7. Troubleshooting

| What you see | Likely cause | What to do |
|---|---|---|
| "Enter a full image address that starts with https://" | The link is missing `https://` or has a space. | Paste the full address, copied from the image's own page or your image host. |
| "Some files were skipped" | A file is not JPG, PNG, WEBP or GIF, is over 5 MB, or would go past 6 images. | Resize or convert the file, or remove an image first. |
| "That image is already added" | The same link was added twice. | Remove the duplicate. |
| Colour does not change the photo on the shop page | No photo is selected for that colour. | Open **Edit**, click the thumbnail under that colour, then save. |
| Colour photo is missing after saving | The colour name was changed after the photo was picked. | Edit the product and pick the photo again for the new colour name. |
| Save fails with an upload error | The network dropped, or the session expired. | Check your connection, sign in again if needed, and retry. |

If a problem continues, note the product name, the steps you took, and any message on the screen, then send them to the developer.
