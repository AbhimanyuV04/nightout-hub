alter table users add column upi_id text check (upi_id ~ '^[\w.-]+@[\w-]+$');

create table expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  paid_by_user_id uuid not null references users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  description text not null check (length(description) between 1 and 200),
  created_at timestamptz not null default now()
);

create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  share_amount numeric(10,2) not null check (share_amount >= 0),
  unique (expense_id, user_id)
);

create index expenses_room_id_idx on expenses (room_id);
create index expense_splits_expense_id_idx on expense_splits (expense_id);
create index expense_splits_user_id_idx on expense_splits (user_id);
