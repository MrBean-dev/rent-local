create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  phone text not null default '',
  location text not null default '',
  bio text not null default '',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can manage own profile" on profiles for all using (auth.uid() = id);

create table listings (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text not null,
  category text not null,
  condition text not null,
  price_per_day numeric not null,
  location text not null,
  image_url text,
  available boolean default true,
  created_at timestamptz default now()
);
alter table listings enable row level security;
create policy "Anyone can view listings" on listings for select using (true);
create policy "Owners can manage own listings" on listings for all using (auth.uid() = owner_id);

create table rental_requests (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references listings on delete cascade not null,
  renter_id uuid references auth.users on delete cascade not null,
  start_date date not null,
  end_date date not null,
  message text default '',
  status text default 'pending',
  created_at timestamptz default now()
);
alter table rental_requests enable row level security;
create policy "Renters can view own requests" on rental_requests for select using (auth.uid() = renter_id);
create policy "Listing owners can view requests" on rental_requests for select using (
  auth.uid() = (select owner_id from listings where id = listing_id)
);
create policy "Renters can create requests" on rental_requests for insert with check (auth.uid() = renter_id);
create policy "Listing owners can update status" on rental_requests for update using (
  auth.uid() = (select owner_id from listings where id = listing_id)
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
