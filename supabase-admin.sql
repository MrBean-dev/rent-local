-- Add role to profiles
alter table profiles add column role text default 'user' not null;

-- Only admins can see all profiles with role info
create policy "Admins can view all profiles" on profiles for select using (
  auth.uid() in (select id from profiles where role = 'admin')
  or auth.uid() = id
);

-- Make yourself admin (run this separately after adding the column)
-- update profiles set role = 'admin' where id = auth.uid();
