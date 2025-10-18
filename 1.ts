const title = document.querySelector('h1');
if (title) {
	title.animate(
		[
			{ transform: 'scale(0.96)', opacity: 0 },
			{ transform: 'scale(1)', opacity: 1 },
		],
		{ duration: 500, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }
	);
}


