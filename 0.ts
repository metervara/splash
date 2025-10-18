const title = document.querySelector('h1');
if (title) {
	title.animate(
		[
			{ transform: 'translateY(8px)', opacity: 0 },
			{ transform: 'translateY(0)', opacity: 1 },
		],
		{ duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }
	);
}


