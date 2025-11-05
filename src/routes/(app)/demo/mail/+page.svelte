<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{data.data}
<form action="/demo/mail?/sendMail" method="POST">
	<button type="submit">send</button>
</form>
