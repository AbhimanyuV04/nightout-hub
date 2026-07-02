-- "My Nights" delete = remove-from-my-list (non-destructive). Rather than deleting a
-- membership (which would cascade-delete that person's expenses/media for everyone), we
-- flag the membership hidden so it just drops out of that user's own list. The night and
-- everyone else's memories stay intact.
alter table users add column if not exists hidden boolean not null default false;
