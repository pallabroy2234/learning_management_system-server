/**
 * @description         - Allowed fields for updating a course
 * */

export const allowedFields = {
    name: true,
    description: true,
    price: true,
    estimatedPrice: true,
    thumbnail: {
        url: true,
        public_id: true
    },
    tags: true,
    level: true,
    demoUrl: true,
    benefits: [
        {
            title: true,
            _id: true
        }
    ],
    prerequisites: [
        {
            title: true,
            _id: true
        }
    ],
    courseData: [
        {
            title: true,
            videoDescription: true,
            videoUrl: true,
            videoSection: true,
            videoLength: true,
            videoPlayer: true,
            links: [
                {
                    title: true,
                    url: true,
                    _id: true,
                }
            ],
            suggestion: true,
            _id: true,
            questions: true
        }
    ],
    rating: true,
    purchased: true,
    _id: true,
    __v: true
};

/**
 * @description         - Filter allowed fields for updating a course
 * @param allowed       - Allowed fields for updating a course
 * @param data          - Data to be filtered
 * */
export const filterAllowedFields = (allowed: any, data: any) => {
    let result = {} as any;
    let invalidKeys: string[] = [];

    for (const key in data) {
        // Exclude root-level _id from being updated
        if (key === '_id' || key === '__v') {
            continue; // Skip root _id field to prevent updating
        }


        // Case 1: Handle arrays of objects (e.g., courseData, benefits, etc.)
        if (Array.isArray(allowed[key]) && Array.isArray(data[key])) {
            result[key] = data[key].map((item: any) => {
                const filteredResult = filterAllowedFields(allowed[key][0], item);

                if (filteredResult.invalidFields.length > 0) {
                    invalidKeys.push(...filteredResult.invalidFields);
                }

                return filteredResult.result;
            });
        }

        // Case 2: Handle nested objects (e.g., thumbnail, links, etc.)
        else if (typeof allowed[key] === 'object' && !Array.isArray(allowed[key]) && data[key]) {
            const filteredResult = filterAllowedFields(allowed[key], data[key]);

            if (filteredResult.invalidFields.length > 0) {
                invalidKeys.push(...filteredResult.invalidFields);
            }

            result[key] = filteredResult.result;
        }

        // Case 3: Allow flat fields that are explicitly marked as true
        else if (allowed[key] === true) {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                result[key] = data[key];
            } else {
                invalidKeys.push(key);
            }
        }

        // Case 4: Mark fields that are not allowed as invalid
        else {
            invalidKeys.push(key);
        }
    }

    return {result, invalidFields: invalidKeys};
};
