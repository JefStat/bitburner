// export function targets() {
// 	return ["n00dles", "foodnstuff", "joesguns"];
// }
// , "johnson-ortho"
// , "the-hub"
export function targets() {
	return ["silver-helix"
		, "crush-fitness"
		, "comptek"
	];
}
// 1.001 is a bitnode 5 value
// 2.1 is a bitnode 1 value
export const growthFactor = 2.1; //2.1
// hack up to 95% of the growth factor to grow a server over time
export const hackFactor = ((growthFactor - 1) * .95); // .5
