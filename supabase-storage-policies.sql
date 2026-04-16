create policy "Users can upload listing images"
on storage.objects for insert
with check (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view listing images"
on storage.objects for select
using (bucket_id = 'listings');

create policy "Users can delete own listing images"
on storage.objects for delete
using (bucket_id = 'listings' and auth.uid()::text = (storage.foldername(name))[1]);
