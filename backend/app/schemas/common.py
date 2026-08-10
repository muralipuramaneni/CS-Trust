from pydantic.alias_generators import to_camel
from pydantic import ConfigDict


API_MODEL_CONFIG = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)
