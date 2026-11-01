-- QC report finding 26: user 1279 ('testmopsw', fashionmatches1@gmail.com) is a test account
-- with the Secretary role in MoPSW. Disable it and remove its permission rows.
-- Check with the admin team that it is not a real officer's account before running.

UPDATE tbl_user SET status = 0
WHERE user_id = 1279 AND email = 'fashionmatches1@gmail.com' AND name = 'testmopsw';

DELETE FROM tbl_rbac_user_module_crud
WHERE user_id = 1279
  AND EXISTS (SELECT 1 FROM tbl_user WHERE user_id = 1279 AND email = 'fashionmatches1@gmail.com');
