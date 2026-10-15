ALTER TABLE upload_assets
  ADD COLUMN document_kind VARCHAR(64),
  ADD COLUMN detected_content_type VARCHAR(100),
  ADD COLUMN media_width INTEGER,
  ADD COLUMN media_height INTEGER,
  ADD CONSTRAINT upload_assets_media_width_check
    CHECK (media_width IS NULL OR media_width > 0),
  ADD CONSTRAINT upload_assets_media_height_check
    CHECK (media_height IS NULL OR media_height > 0);

UPDATE upload_assets AS asset
SET document_kind = document.kind
FROM driver_documents AS document
WHERE document.asset_id = asset.id;

CREATE INDEX upload_assets_document_kind_status_idx
  ON upload_assets(document_kind, status);
